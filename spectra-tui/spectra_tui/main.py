"""Spectra TUI - Terminal Dashboard for AI Trading Agents."""

import json
import math
from datetime import datetime
from typing import Any

import httpx
from rich.align import Align
from rich.style import Style
from rich.text import Text
from textual import work
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import (
    DataTable,
    Footer,
    Header,
    Label,
    RichLog,
    Static,
)

from .config import config


# 3D Voxel Text Renderer - actual 3D model with depth
class Text3D:
    """True 3D voxel-based text with rotation and shading."""

    # 5x7 font for cleaner letters (taller = better proportions)
    FONT = {
        'S': [
            "█████",
            "█    ",
            "█    ",
            "█████",
            "    █",
            "    █",
            "█████",
        ],
        'P': [
            "█████",
            "█   █",
            "█   █",
            "█████",
            "█    ",
            "█    ",
            "█    ",
        ],
        'E': [
            "█████",
            "█    ",
            "█    ",
            "████ ",
            "█    ",
            "█    ",
            "█████",
        ],
        'C': [
            "█████",
            "█    ",
            "█    ",
            "█    ",
            "█    ",
            "█    ",
            "█████",
        ],
        'T': [
            "█████",
            "  █  ",
            "  █  ",
            "  █  ",
            "  █  ",
            "  █  ",
            "  █  ",
        ],
        'R': [
            "█████",
            "█   █",
            "█   █",
            "█████",
            "█ █  ",
            "█  █ ",
            "█   █",
        ],
        'A': [
            " ███ ",
            "█   █",
            "█   █",
            "█████",
            "█   █",
            "█   █",
            "█   █",
        ],
    }

    def __init__(self, text: str = "SPECTRA", depth: int = 3):
        self.text = text
        self.depth = depth
        self.voxels: list[tuple[float, float, float]] = []
        self._build_voxels()

    def _build_voxels(self) -> None:
        """Build 3D voxel model from text."""
        self.voxels = []
        x_offset = 0

        for char in self.text:
            if char not in self.FONT:
                x_offset += 6
                continue

            letter = self.FONT[char]
            for y, row in enumerate(letter):
                for x, ch in enumerate(row):
                    if ch == '█':
                        # Create voxel with full depth (solid 3D block)
                        for z in range(self.depth):
                            self.voxels.append((x_offset + x, y, z))
            x_offset += 6  # Letter width + gap

        # Center the model at origin
        if self.voxels:
            cx = sum(v[0] for v in self.voxels) / len(self.voxels)
            cy = sum(v[1] for v in self.voxels) / len(self.voxels)
            cz = sum(v[2] for v in self.voxels) / len(self.voxels)
            self.voxels = [(x - cx, y - cy, z - cz) for x, y, z in self.voxels]

    def render(self, angle: float, screen_width: int = 80, screen_height: int = 15) -> str:
        """Render 3D model with Y-axis rotation."""
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        # Rotate and project all voxels
        projected: list[tuple[int, int, float]] = []

        for x, y, z in self.voxels:
            # Rotate around Y axis
            rx = x * cos_a - z * sin_a
            rz = x * sin_a + z * cos_a
            ry = y

            # Perspective projection
            distance = 30.0
            fov = 50.0
            scale = fov / (distance + rz)

            # Project to screen (2x for aspect ratio)
            sx = int(rx * scale * 2.0) + screen_width // 2
            sy = int(ry * scale) + screen_height // 2

            if 0 <= sx < screen_width and 0 <= sy < screen_height:
                projected.append((sx, sy, rz))

        # Create screen with z-buffer
        screen = [[' ' for _ in range(screen_width)] for _ in range(screen_height)]
        zbuf = [[float('-inf') for _ in range(screen_width)] for _ in range(screen_height)]

        # Sort back-to-front and render
        projected.sort(key=lambda p: p[2])

        for sx, sy, rz in projected:
            if rz > zbuf[sy][sx]:
                zbuf[sy][sx] = rz
                # Shade based on depth (front = bright, back = dark)
                norm_z = (rz + self.depth) / (self.depth * 2)
                if norm_z > 0.65:
                    screen[sy][sx] = '█'
                elif norm_z > 0.45:
                    screen[sy][sx] = '▓'
                elif norm_z > 0.25:
                    screen[sy][sx] = '▒'
                else:
                    screen[sy][sx] = '░'

        return '\n'.join(''.join(row) for row in screen)


# Loading bar settings
LOAD_TOTAL_FRAMES = 50  # 5 seconds at 0.1s interval


class LogoWidget(Static):
    """Animated 3D logo widget with real rotation."""

    DEFAULT_CSS = """
    LogoWidget {
        width: 100%;
        height: auto;
        content-align: center middle;
        text-align: center;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._angle = 0.0
        self._frame = 0
        self._text3d = Text3D("SPECTRA", depth=4)

    def on_mount(self) -> None:
        self._update_display()  # Show initial frame immediately
        self.set_interval(0.08, self._animate)  # ~12 FPS for smooth rotation

    def _animate(self) -> None:
        self._angle += 0.12  # Rotation speed
        self._frame += 1
        self._update_display()

    def _render_loading_bar(self, progress: float) -> str:
        """Render a smooth gradient loading bar."""
        bar_width = 32
        filled = int(progress * bar_width)

        # Gradient characters for smooth fill
        chars = " ░▒▓█"

        bar = ""
        for i in range(bar_width):
            if i < filled:
                bar += "█"
            elif i == filled:
                # Partial fill with gradient
                partial = (progress * bar_width) - filled
                char_idx = int(partial * (len(chars) - 1))
                bar += chars[char_idx]
            else:
                bar += "░"

        percent = int(progress * 100)
        return f"[{bar}] {percent}%"

    def _update_display(self) -> None:
        output = Text()

        # Render 3D rotating text
        rendered_3d = self._text3d.render(self._angle, screen_width=80, screen_height=12)
        output.append(rendered_3d, style=Style(color="white", bold=True))

        # Loading bar progress (5 seconds = 50 frames at 0.1s, but we're at 0.08s so ~62 frames)
        progress = min(self._frame / 62, 1.0)
        loading_bar = self._render_loading_bar(progress)

        output.append(f"\n\n{loading_bar}\n", style=Style(color="#00aaff"))
        output.append("\n         INITIALIZING AGENTS...\n", style=Style(color="#444444"))

        self.update(Align.center(output))


class LoadingScreen(Screen):
    """Loading screen."""

    DEFAULT_CSS = """
    LoadingScreen {
        background: #000000;
        align: center middle;
    }

    #logo-container {
        width: 90;
        height: auto;
        align: center middle;
    }

    #skip {
        text-align: center;
        color: #333333;
        margin-top: 1;
    }
    """

    def compose(self) -> ComposeResult:
        with Container(id="logo-container"):
            yield LogoWidget()
            yield Label("press any key to skip", id="skip")

    def on_mount(self) -> None:
        self.set_timer(config.loading_delay, self._go_to_dashboard)

    def on_key(self) -> None:
        self._go_to_dashboard()

    def _go_to_dashboard(self) -> None:
        self.app.push_screen("dashboard")


class StatCard(Static):
    """Simple stat card."""

    DEFAULT_CSS = """
    StatCard {
        width: 1fr;
        height: 3;
        background: #000000;
        border: solid #333333;
        margin: 0 1;
        padding: 0 1;
    }

    StatCard .title {
        color: #666666;
    }

    StatCard .value {
        color: #ffffff;
        text-style: bold;
    }
    """

    def __init__(self, title: str, value: str = "0") -> None:
        super().__init__()
        self._title = title
        self._value = value

    def compose(self) -> ComposeResult:
        yield Label(self._title, classes="title")
        yield Label(self._value, classes="value", id=f"v-{self._title.lower()}")

    def set_value(self, value: str) -> None:
        try:
            self.query_one(".value", Label).update(value)
        except Exception:
            pass


class AgentCard(Static):
    """Agent info card."""

    DEFAULT_CSS = """
    AgentCard {
        width: 1fr;
        height: auto;
        background: #000000;
        border: solid #444444;
        margin: 0 1;
        padding: 1;
    }

    AgentCard .name {
        color: #ffffff;
        text-style: bold;
    }

    AgentCard .stat {
        color: #888888;
    }

    AgentCard .status {
        color: #ffffff;
    }
    """

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        super().__init__()
        self._data = data or {}

    def compose(self) -> ComposeResult:
        name = self._data.get("name", "---")
        role = self._data.get("role", "---")
        trades = self._data.get("totalTrades", 0)
        avg = self._data.get("avgAmount", 0)
        risk = self._data.get("avgRisk", 0)
        bad = self._data.get("badTrades", 0)
        behavior = self._data.get("behavior", "---").upper()

        yield Label(f"{name} [{role}]", classes="name")
        yield Label(f"Trades: {trades}  Avg: ${avg:,.0f}", classes="stat")
        yield Label(f"Risk: {risk:.0f}%  Bad: {bad}", classes="stat")
        yield Label(f"Status: {behavior}", classes="status")


class DashboardScreen(Screen):
    """Main dashboard."""

    DEFAULT_CSS = """
    DashboardScreen {
        background: #000000;
    }

    #main {
        width: 100%;
        height: 100%;
        padding: 1;
    }

    #stats-row {
        width: 100%;
        height: 4;
        margin-bottom: 1;
    }

    #agents-row {
        width: 100%;
        height: auto;
        margin-bottom: 1;
    }

    #content-row {
        width: 100%;
        height: 1fr;
    }

    #trades-box {
        width: 1fr;
        height: 100%;
        border: solid #444444;
        background: #000000;
        padding: 1;
    }

    #api-box {
        width: 1fr;
        height: 100%;
        border: solid #444444;
        background: #000000;
        padding: 1;
        margin-left: 1;
    }

    .box-title {
        color: #ffffff;
        text-style: bold;
        margin-bottom: 1;
    }

    #trades-table {
        width: 100%;
        height: 1fr;
        background: #000000;
    }

    #api-log {
        width: 100%;
        height: 1fr;
        background: #000000;
    }

    #status {
        width: 100%;
        height: 1;
        background: #0a0a0a;
        color: #555555;
        text-align: center;
    }

    DataTable {
        background: #000000;
    }

    DataTable > .datatable--header {
        background: #111111;
        color: #ffffff;
    }

    DataTable > .datatable--cursor {
        background: #1a1a1a;
    }

    DataTable > .datatable--even-row {
        background: #000000;
    }

    DataTable > .datatable--odd-row {
        background: #050505;
    }

    Header {
        background: #000000;
        color: #ffffff;
    }

    Footer {
        background: #000000;
        color: #555555;
    }
    """

    BINDINGS = [
        ("r", "refresh", "Refresh"),
        ("c", "clear", "Clear"),
        ("q", "quit", "Quit"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._last_trade_id: str | None = None

    def compose(self) -> ComposeResult:
        yield Header()

        with Vertical(id="main"):
            with Horizontal(id="stats-row"):
                yield StatCard("AGENTS", "0/3")
                yield StatCard("TRADES", "0")
                yield StatCard("RISK", "0%")
                yield StatCard("ANOMALIES", "0")
                yield StatCard("BAD", "0")

            with Horizontal(id="agents-row"):
                yield AgentCard({"name": "ALPHA", "role": "Arb"})
                yield AgentCard({"name": "BETA", "role": "Momentum"})
                yield AgentCard({"name": "GAMMA", "role": "Liquidity"})

            with Horizontal(id="content-row"):
                with Vertical(id="trades-box"):
                    yield Label("TRADES", classes="box-title")
                    yield DataTable(id="trades-table", zebra_stripes=True)

                with Vertical(id="api-box"):
                    yield Label("API", classes="box-title")
                    yield RichLog(id="api-log", markup=True, wrap=True)

            yield Label("Waiting...", id="status")

        yield Footer()

    def on_mount(self) -> None:
        self._setup_table()
        self.set_interval(config.refresh_interval, self._fetch)
        self._fetch()

    def _setup_table(self) -> None:
        table = self.query_one("#trades-table", DataTable)
        table.add_column("Time", width=10)
        table.add_column("Agent", width=7)
        table.add_column("Act", width=5)
        table.add_column("Token", width=6)
        table.add_column("Amount", width=10)
        table.add_column("Risk", width=6)
        table.add_column("Status", width=12)

    @work(exclusive=True, thread=True)
    def _fetch(self) -> None:
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{config.api_base_url}/api/dashboard")
                if resp.status_code == 200:
                    self.app.call_from_thread(self._on_data, resp.json())
                else:
                    self.app.call_from_thread(self._on_error, f"HTTP {resp.status_code}")
        except Exception as e:
            self.app.call_from_thread(self._on_error, str(e))

    def _on_data(self, data: dict[str, Any]) -> None:
        # Update stats
        summary = data.get("summary", {})
        cards = list(self.query(StatCard))
        if len(cards) >= 5:
            cards[0].set_value(f"{summary.get('activeAgents', 0)}/{summary.get('totalAgents', 3)}")
            cards[1].set_value(str(summary.get("totalTrades", 0)))
            cards[2].set_value(f"{summary.get('avgRisk', 0):.0f}%")
            cards[3].set_value(str(summary.get("anomalyCount", 0)))
            cards[4].set_value(str(summary.get("badTradeCount", 0)))

        # Update agents
        agents = data.get("agents", [])
        agent_cards = list(self.query(AgentCard))
        for i, agent in enumerate(agents):
            if i < len(agent_cards):
                parent = agent_cards[i].parent
                if parent:
                    idx = list(parent.children).index(agent_cards[i])
                    agent_cards[i].remove()
                    parent.mount(AgentCard(agent), before=idx if idx < len(list(parent.children)) else None)

        # Update trades table
        table = self.query_one("#trades-table", DataTable)
        table.clear()
        for trade in data.get("trades", [])[:config.max_trades_display]:
            try:
                ts = trade.get("timestamp", "")
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                time_str = dt.strftime("%H:%M:%S")
            except Exception:
                time_str = "??:??:??"

            table.add_row(
                time_str,
                trade.get("agent", "?").upper()[:5],
                trade.get("action", "?").upper()[:4],
                trade.get("token", "?")[:5],
                f"${trade.get('amount', 0):,.0f}",
                f"{int(trade.get('riskScore', 0))}%",
                trade.get("behavior", "?").upper()[:10],
            )

        # Log new trades
        trades = data.get("trades", [])
        if trades and trades[0].get("id") != self._last_trade_id:
            self._last_trade_id = trades[0].get("id")
            log = self.query_one("#api-log", RichLog)
            ts = datetime.now().strftime("%H:%M:%S")
            log.write(f"[white]-- {ts} NEW TRADE --[/white]")
            trade_json = json.dumps(trades[0], indent=2, default=str)
            for line in trade_json.split("\n"):
                log.write(f"[grey70]{line}[/grey70]")
            log.write("")

        # Update status
        ts = data.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            time_str = dt.strftime("%H:%M:%S")
        except Exception:
            time_str = "??:??:??"
        self.query_one("#status", Label).update(f"Last sync: {time_str} | {len(data.get('trades', []))} trades | R=refresh C=clear Q=quit")

    def _on_error(self, msg: str) -> None:
        log = self.query_one("#api-log", RichLog)
        log.write(f"[red]ERROR: {msg[:60]}[/red]")

    def action_refresh(self) -> None:
        self._fetch()

    def action_clear(self) -> None:
        self.query_one("#api-log", RichLog).clear()

    def action_quit(self) -> None:
        self.app.exit()


class SpectraApp(App):
    """Spectra TUI."""

    TITLE = "SPECTRA"

    CSS = """
    Screen {
        background: #000000;
    }

    Header {
        background: #000000;
        color: #ffffff;
        height: 1;
    }

    Footer {
        background: #000000;
        color: #444444;
    }

    Footer > .footer--key {
        background: #111111;
        color: #ffffff;
    }

    Footer > .footer--description {
        color: #666666;
    }
    """

    SCREENS = {
        "loading": LoadingScreen,
        "dashboard": DashboardScreen,
    }

    def on_mount(self) -> None:
        self.push_screen("loading")


def main() -> None:
    app = SpectraApp()
    app.run()


if __name__ == "__main__":
    main()
