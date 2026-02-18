"""Streamlit UI for preview and manual control."""

from datetime import datetime as dt

from .core.dates import get_today_ramadan_day
from .cache import generate_and_cache
from .cli import send_today
from .logger import logger
from .ui_components import (
    render_stat_card,
    render_juz_selector,
    render_preview_buttons,
    render_send_stats,
    render_send_action,
    render_batch_generation,
)

__all__ = ["run_streamlit_ui"]


def _stat_card(label: str, value: str, icon: str = "📊"):  # pragma: no cover
    """Render a styled stat card. DEPRECATED: Use render_stat_card from ui_components."""
    try:
        import streamlit as st
    except ImportError:
        return

    with st.container():
        col = st.columns([1])[0]
        with col:
            st.markdown(
                f"""
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    padding: 20px;
                    color: white;
                    text-align: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <div style="font-size: 2em; margin-bottom: 10px;">{icon}</div>
                    <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 5px;">{value}</div>
                    <div style="font-size: 0.9em; opacity: 0.9;">{label}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )


def _init_page_config():
    """Initialize page configuration and custom CSS."""
    try:
        import streamlit as st
    except ImportError:
        return

    st.set_page_config(
        page_title="Ramadan Fajr Bot",
        page_icon="🌙",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.markdown(
        """
        <style>
            h1 { color: #D4AF37; text-align: center; margin-bottom: 2rem; }
            h2 { color: #667eea; border-bottom: 2px solid #D4AF37; padding-bottom: 0.5rem; }
            .stTabs [data-baseweb="tab-list"] { gap: 2em; }
            .stTabs [data-baseweb="tab"] { padding: 1em 2em; font-weight: 600; }
            .stButton > button {
                border-radius: 8px;
                padding: 0.75rem 2rem;
                font-weight: 600;
                transition: all 0.3s ease;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_sidebar(config):
    """Render sidebar with configuration info."""
    try:
        import streamlit as st
    except ImportError:
        return

    with st.sidebar:
        st.markdown("### ⚙️ Configuration")
        today = get_today_ramadan_day()
        st.markdown(
            f"""
            **Timezone:** `{config.TZ}`
            **Location:** `{config.LAT:.2f}°N, {config.LON:.2f}°E`
            **Ramadan Day:** `{today} / 30`
            """
        )
        st.divider()

        st.markdown("### 📋 Info")
        st.markdown(
            """
            This interface lets you:
            - 👀 Preview Juz images
            - 📤 Send Fajr reminders
            - 💾 Pre-generate all 30 Juz
            - ⚙️ View configuration
            """
        )


def _render_preview_tab(config):
    """Render the Preview tab."""
    try:
        import streamlit as st
    except ImportError:
        return

    st.markdown("### Select & Preview Juz Image")

    selected = render_juz_selector(st)
    st.divider()
    render_preview_buttons(st, selected)


def _render_send_tab(config):
    """Render the Send Now tab."""
    try:
        import streamlit as st
    except ImportError:
        return

    st.markdown("### Send Today's Fajr Reminder")

    render_send_stats(st, config)
    st.divider()

    st.markdown(
        "**Send an email/SMS with today's Fajr Juz image:**\n"
        "This will use your configured SMTP or SendGrid settings."
    )

    render_send_action(st)


def _render_batch_tab():
    """Render the Batch Cache tab."""
    try:
        import streamlit as st
    except ImportError:
        return

    st.markdown("### Pre-generate All 30 Juz Images")

    st.info(
        "📌 Pre-generating all Juz images speeds up sending and ensures quality."
        "\n\nThis will generate ~30 images (30-45 minutes depending on GPU/API rate limits)."
    )

    col1, col2 = st.columns(2)

    with col1:
        render_batch_generation(st)

    with col2:
        st.markdown("#### Tips")
        st.markdown(
            """
            - **First run** takes ~1 hour
            - **Subsequent runs** are faster (cached)
            - **GPU recommended** for speed
            - **Monitor API rate** limits
            """
        )


def _render_settings_tab(config):
    """Render the Settings tab."""
    try:
        import streamlit as st
    except ImportError:
        return

    st.markdown("### Configuration Details")

    setting_col1, setting_col2 = st.columns(2)

    with setting_col1:
        st.markdown("#### Location & Time")
        st.json(
            {
                "timezone": config.TZ,
                "latitude": float(config.LAT),
                "longitude": float(config.LON),
                "fajr_depression": getattr(config, "FAJR_DEPRESSION", 18.0),
            }
        )

    with setting_col2:
        st.markdown("#### Services")
        st.json(
            {
                "smtp_configured": bool(config.EMAIL_USER and config.EMAIL_PASS),
                "sendgrid_configured": bool(config.SENDGRID_API_KEY),
                "test_mode": config.TEST_MODE,
                "s3_enabled": bool(config.S3_BUCKET),
            }
        )

    st.divider()
    st.markdown("#### System Info")

    today = get_today_ramadan_day()
    info_col1, info_col2, info_col3 = st.columns(3)

    with info_col1:
        st.metric("Ramadan Day", today, delta="/ 30")

    with info_col2:
        st.metric("Current Time", dt.now().strftime("%H:%M:%S"), delta="UTC")

    with info_col3:
        st.metric("Juz Count", 30, delta="total")


def run_streamlit_ui():  # pragma: no cover
    """Launch Streamlit preview UI with enhanced styling."""
    try:
        import streamlit as st
    except ImportError:
        logger.error(
            "Streamlit is required for --preview mode. Install with: pip install streamlit"
        )
        return

    from . import config

    _init_page_config()
    _render_sidebar(config)

    st.markdown(
        "<h1>🌙 Ramadan Fajr Bot</h1><p style='text-align: center; color: #999;'>"
        "Preview images, send Fajr reminders & manage caches</p>",
        unsafe_allow_html=True,
    )

    tab_preview, tab_send, tab_batch, tab_settings = st.tabs(
        ["👀 Preview", "📤 Send Now", "💾 Batch Cache", "⚙️ Settings"]
    )

    with tab_preview:
        _render_preview_tab(config)

    with tab_send:
        _render_send_tab(config)

    with tab_batch:
        _render_batch_tab()

    with tab_settings:
        _render_settings_tab(config)
