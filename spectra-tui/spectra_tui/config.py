"""Configuration for Spectra TUI."""

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Application configuration."""

    api_base_url: str = "http://localhost:3000"
    refresh_interval: int = 5  # seconds
    max_trades_display: int = 20
    loading_delay: float = 5.0  # seconds

    @classmethod
    def from_env(cls) -> "Config":
        """Create config from environment variables."""
        return cls(
            api_base_url=os.getenv("SPECTRA_API_URL", "http://localhost:3000"),
            refresh_interval=int(os.getenv("SPECTRA_REFRESH_INTERVAL", "5")),
            max_trades_display=int(os.getenv("SPECTRA_MAX_TRADES", "20")),
            loading_delay=float(os.getenv("SPECTRA_LOADING_DELAY", "5.0")),
        )


# Global config instance
config = Config.from_env()
