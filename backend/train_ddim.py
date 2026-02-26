import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader
from torch.utils.data import TensorDataset

from tqdm.auto import tqdm
import numpy as np
from svgpathtools import parse_path

from positional_embeddings import PositionalEmbedding

class Block(nn.Module):
    def __init__(self, size: int):
        super().__init__()

        self.ff = nn.Linear(size, size)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor):
        return x + self.act(self.ff(x))


class MLP(nn.Module):
    def __init__(self, hidden_size: int = 128, hidden_layers: int = 3, emb_size: int = 128,
                 time_emb: str = "sinusoidal", input_emb: str = "sinusoidal"):
        super().__init__()

        self.time_mlp = PositionalEmbedding(emb_size, time_emb)
        self.input_mlp1 = PositionalEmbedding(emb_size, input_emb, scale=25.0)
        self.input_mlp2 = PositionalEmbedding(emb_size, input_emb, scale=25.0)

        concat_size = len(self.time_mlp.layer) + \
            len(self.input_mlp1.layer) + len(self.input_mlp2.layer)
        layers = [nn.Linear(concat_size, hidden_size), nn.GELU()]
        for _ in range(hidden_layers):
            layers.append(Block(hidden_size))
        layers.append(nn.Linear(hidden_size, 2))
        self.joint_mlp = nn.Sequential(*layers)

    def forward(self, x, t):
        x1_emb = self.input_mlp1(x[:, 0])
        x2_emb = self.input_mlp2(x[:, 1])
        t_emb = self.time_mlp(t)
        x = torch.cat((x1_emb, x2_emb, t_emb), dim=-1)
        x = self.joint_mlp(x)
        return x
    
class NoiseScheduler():
    def __init__(self,
                 num_timesteps=1000,
                 beta_start=0.0001,
                 beta_end=0.02,
                 beta_schedule="linear"):

        self.num_timesteps = num_timesteps
        if beta_schedule == "linear":
            self.betas = torch.linspace(
                beta_start, beta_end, num_timesteps, dtype=torch.float32)
        elif beta_schedule == "quadratic":
            self.betas = torch.linspace(
                beta_start ** 0.5, beta_end ** 0.5, num_timesteps, dtype=torch.float32) ** 2

        self.alphas = 1.0 - self.betas
        self.alphas_cumprod = torch.cumprod(self.alphas, axis=0)
        self.alphas_cumprod_prev = F.pad(
            self.alphas_cumprod[:-1], (1, 0), value=1.)

        # required for self.add_noise
        self.sqrt_alphas_cumprod = self.alphas_cumprod ** 0.5
        self.sqrt_one_minus_alphas_cumprod = (1 - self.alphas_cumprod) ** 0.5

        # required for reconstruct_x0
        self.sqrt_inv_alphas_cumprod = torch.sqrt(1 / self.alphas_cumprod)
        self.sqrt_inv_alphas_cumprod_minus_one = torch.sqrt(
            1 / self.alphas_cumprod - 1)

        # required for q_posterior
        self.posterior_mean_coef1 = self.betas * torch.sqrt(self.alphas_cumprod_prev) / (1. - self.alphas_cumprod)
        self.posterior_mean_coef2 = (1. - self.alphas_cumprod_prev) * torch.sqrt(self.alphas) / (1. - self.alphas_cumprod)

    def set_timesteps(self, num_inference_steps):
        '''
        For DDIM
        From original timesteps -> num_inference_steps
        '''
        self.num_inference_steps = num_inference_steps
        step_ratio = self.num_timesteps // num_inference_steps
        
        timesteps = (np.arange(0, num_inference_steps) * step_ratio).round()[::-1].copy().astype(np.int64)
        self.timesteps = torch.from_numpy(timesteps)
    
    def ddim_step(self, model_output, timestep, prev_timestep, sample):
        prev_t = prev_timestep

        if prev_t >= 0:
            alpha_prod_t_prev = self.alphas_cumprod[prev_t]
        else:
            alpha_prod_t_prev = torch.tensor(1.0, device=sample.device)

        pred_original_sample = self.reconstruct_x0(sample, timestep, model_output)
        dir_xt = (1 - alpha_prod_t_prev) ** 0.5 * model_output

        return alpha_prod_t_prev ** 0.5 * pred_original_sample + dir_xt
    
    def reconstruct_x0(self, x_t, t, noise):
        s1 = self.sqrt_inv_alphas_cumprod[t]
        s2 = self.sqrt_inv_alphas_cumprod_minus_one[t]
        s1 = s1.reshape(-1, 1)
        s2 = s2.reshape(-1, 1)
        return s1 * x_t - s2 * noise
    
    def add_noise(self, x_start, x_noise, timesteps):
        s1 = self.sqrt_alphas_cumprod[timesteps]
        s2 = self.sqrt_one_minus_alphas_cumprod[timesteps]

        s1 = s1.reshape(-1, 1)
        s2 = s2.reshape(-1, 1)

        return s1 * x_start + s2 * x_noise

    def __len__(self):
        return self.num_timesteps
    
def svg_path_to_2d(path_string: str, num_points=500, noise_scale=0.05) -> list[float]:
    """
    將 SVG path 字串轉換為 2D 座標點, 並生成隨機偏移。
    """
    path = parse_path(path_string)
    
    points = []
    for i in range(num_points):
        t = i / float(num_points - 1) 
        complex_pt = path.point(t)
        points.append([complex_pt.real, complex_pt.imag])

    points = np.array(points)
    x = points[:, 0]
    y = points[:, 1]

    x = (x - x.mean()) / (x.std() + 1e-5) * 2.0
    y = (y - y.mean()) / (y.std() + 1e-5) * 2.0
    # jitter
    rng = np.random.default_rng()
    x = x + rng.normal(size=len(x)) * noise_scale
    y = y + rng.normal(size=len(y)) * noise_scale

    X_final = np.stack((x, y), axis=1)
    
    return TensorDataset(torch.from_numpy(X_final.astype(np.float32)))

def train_ddim(svg_path: str, num_points: int, noise_scale: float, model_path: str, model_name: str, config):
    '''
    input : 
        svg_path : svg path data (ex: M 40 5 L 15 -10 L -5 10 L -30 -15 L -45 0 L -25 15 L -5 30 L 20 5 Z)
        num_points : the number of dots to composite the svg graph
        noise_scale : jitter scale, rng value to each dot
    '''
    dataset = svg_path_to_2d(svg_path, num_points, noise_scale)
    dataloader = DataLoader(dataset, batch_size=config.train_batch_size, shuffle=True, drop_last=True)
    model = MLP(
        hidden_size=config.hidden_size,
        hidden_layers=config.hidden_layers,
        emb_size=config.embedding_size,
        time_emb=config.time_embedding,
        input_emb=config.input_embedding)

    noise_scheduler = NoiseScheduler(
        num_timesteps=config.num_timesteps,
        beta_schedule=config.beta_schedule)

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
    )

    global_step = 0
    losses = []
    print("Training model...")
    for epoch in range(config.num_epochs):
        model.train()
        progress_bar = tqdm(total=len(dataloader))
        progress_bar.set_description(f"Epoch {epoch}")
        for batch in dataloader:
            batch = batch[0]
            noise = torch.randn(batch.shape)
            timesteps = torch.randint(
                0, noise_scheduler.num_timesteps, (batch.shape[0],)
            ).long()

            noisy = noise_scheduler.add_noise(batch, noise, timesteps)
            noise_pred = model(noisy, timesteps)
            loss = F.mse_loss(noise_pred, noise)
            loss.backward()

            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            optimizer.zero_grad()

            progress_bar.update(1)
            logs = {"loss": loss.detach().item(), "step": global_step}
            losses.append(loss.detach().item())
            progress_bar.set_postfix(**logs)
            global_step += 1
        progress_bar.close()
    torch.save(model.state_dict(), f"{model_path}/{model_name}.pth")
    return model