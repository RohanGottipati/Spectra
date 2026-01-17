# Spectra TUI

Terminal User Interface for Spectra AI Trading Agents. A full-featured TUI built with [Textual](https://textual.textualize.io/) that displays real-time agent trading data.

## Features

- Animated loading screen with spinning "SPECTRA" ASCII art
- Real-time dashboard with agent statistics
- Live trades table with color-coded risk levels
- API activity log showing recent requests
- Summary statistics cards (Active Agents, Total Trades, Risk, Anomalies, Bad Trades)
- Agent status panels with behavior classification

## Installation

### Using pip

```bash
cd spectra-tui
pip install -e .
```

### Using uv (recommended)

```bash
cd spectra-tui
uv pip install -e .
```

### Dependencies

The TUI requires these Python packages (automatically installed):
- `textual>=0.47.0` - TUI framework
- `httpx>=0.27.0` - HTTP client for API calls
- `rich>=13.7.0` - Rich text rendering
- `pyfiglet>=1.0.2` - ASCII art generation

## Usage

### Running the TUI

```bash
# After installation
spectra

# Or run directly
python -m spectra_tui.main
```

### Environment Variables

Configure the TUI with these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SPECTRA_API_URL` | `http://localhost:3000` | Base URL for the Spectra API |
| `SPECTRA_REFRESH_INTERVAL` | `5` | Data refresh interval in seconds |
| `SPECTRA_MAX_TRADES` | `20` | Maximum trades to display in table |
| `SPECTRA_LOADING_DELAY` | `3.0` | Loading screen duration in seconds |

Example:
```bash
SPECTRA_API_URL=http://localhost:3000 SPECTRA_REFRESH_INTERVAL=3 spectra
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `r` | Manually refresh data |
| `d` | Toggle dark/light mode |
| `q` | Quit the application |
| `ESC` | Go back to previous screen |

## API Endpoint

The TUI requires the Spectra web application to be running with the dashboard API endpoint:

```
GET /api/dashboard
```

Returns:
```json
{
  "agents": [...],
  "trades": [...],
  "summary": {
    "totalTrades": 100,
    "activeAgents": 3,
    "totalAgents": 3,
    "avgRisk": 45.2,
    "anomalyCount": 2,
    "badTradeCount": 1
  },
  "timestamp": "2024-01-17T12:00:00Z"
}
```

## Running with the Web App

1. Start the Next.js web application:
   ```bash
   cd spectra
   pnpm dev
   ```

2. In a new terminal, run the TUI:
   ```bash
   cd spectra-tui
   spectra
   ```

## Screenshots

The TUI includes:
- **Loading Screen**: Animated ASCII "SPECTRA" logo with color cycling
- **Dashboard**: Full-width display with summary cards, agent panels, trades table, and API log

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run with auto-reload
textual run --dev spectra_tui.main:SpectraApp
```
