"""Reusable Streamlit UI components for Ramadan Bot."""

from datetime import datetime as dt
from typing import Optional, Dict, Any
from .cache import generate_and_cache
from .cli import send_today
from .core.dates import get_today_ramadan_day
from .logger import logger

# ============================================================================
# CONSTANTS
# ============================================================================

STAT_CARD_STYLE = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"

BUTTON_LABELS = {
    "preview": "🎨 Generate Preview",
    "regenerate": "🔄 Force Regenerate",
    "send": "📤 Send Fajr Reminder Now",
    "batch": "💾 Start Batch Generation",
}

MESSAGES = {
    "generating": "⏳ Generating Juz {}... (this may take 30-60s)",
    "sending": "⏳ Generating image & sending...",
    "batch": "⏳ Generating Juz {}...",
    "batch_complete": "✅ Batch generation complete!",
    "send_success": "✅ Reminder sent!",
    "error": "❌ Error: {}",
}

THEME_CSS = """
    <style>
    .stTabs [data-baseweb="tab-list"] {
        gap: 10px;
    }
    .stat-card {
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    </style>
"""

# ============================================================================
# COMPONENT FUNCTIONS
# ============================================================================


def render_stat_card(st, label: str, value: str, icon: str = "📊") -> None:
    """Render styled stat card.

    Args:
        st: Streamlit module
        label: Card label
        value: Card value (can be multiline)
        icon: Icon emoji
    """
    html_str = (
        f'<div class="stat-card">'
        f"<h3>{icon} {label}</h3>"
        f'<p style="font-size: 24px; margin: 10px 0;">{value}</p>'
        f"</div>"
    )
    st.markdown(html_str, unsafe_allow_html=True)


def render_juz_selector(st) -> int:
    """Return selected juz number.

    Args:
        st: Streamlit module

    Returns:
        Selected juz (1-30)
    """
    col1, col2 = st.columns([2, 1])
    with col1:
        selected = st.selectbox(
            "Select Juz", range(1, 31), format_func=lambda x: f"Juz {x}"
        )
    with col2:
        today_juz = get_today_ramadan_day()
        st.metric("Today's Juz", today_juz)
    return selected


def render_preview_buttons(st, selected: int) -> None:
    """Render preview generation buttons.

    Args:
        st: Streamlit module
        selected: Selected juz number
    """
    col1, col2 = st.columns(2)

    with col1:
        if st.button(BUTTON_LABELS["preview"], key="preview_btn"):
            try:
                with st.spinner(MESSAGES["generating"].format(selected)):
                    # generate_and_cache returns (image_bytes, file_path)
                    image_bytes, image_path = generate_and_cache(selected, force=False)
                    if image_bytes and image_path:
                        st.success(f"✅ Juz {selected} generated!")
                        st.image(image_bytes, use_column_width=True)
                    else:
                        st.error(MESSAGES["error"].format("Generation failed"))
            except Exception as e:
                logger.error(f"Preview error for Juz {selected}: {e}")
                st.error(MESSAGES["error"].format(str(e)))

    with col2:
        if st.button(BUTTON_LABELS["regenerate"], key="regen_btn"):
            try:
                with st.spinner(MESSAGES["generating"].format(selected)):
                    # generate_and_cache returns (image_bytes, file_path)
                    image_bytes, image_path = generate_and_cache(selected, force=True)
                    if image_bytes and image_path:
                        st.success(f"♻️ Juz {selected} regenerated!")
                        st.image(image_bytes, use_column_width=True)
                    else:
                        st.error(MESSAGES["error"].format("Regeneration failed"))
            except Exception as e:
                logger.error(f"Regenerate error for Juz {selected}: {e}")
                st.error(MESSAGES["error"].format(str(e)))


def render_send_stats(st, config: Dict[str, Any]) -> None:
    """Display send tab statistics.

    Args:
        st: Streamlit module
        config: Configuration dict
    """
    today_juz = get_today_ramadan_day()

    col1, col2, col3 = st.columns(3)

    with col1:
        render_stat_card(st, "Today's Juz", str(today_juz), "📖")

    with col2:
        day_of_ramadan = today_juz
        render_stat_card(st, "Ramadan Day", str(day_of_ramadan), "📅")

    with col3:
        next_juz = today_juz + 1 if today_juz < 30 else 1
        render_stat_card(st, "Next Juz", str(next_juz), "➡️")


def render_send_action(st) -> None:
    """Render send reminder action.

    Args:
        st: Streamlit module
    """
    col1, col2 = st.columns([2, 1])

    with col1:
        if st.button(BUTTON_LABELS["send"], key="send_btn", use_container_width=True):
            try:
                with st.spinner(MESSAGES["sending"]):
                    result = send_today()
                    if result and result.get("skipped"):
                        st.warning(result.get("message", "Send skipped"))
                    elif result and result.get("sent"):
                        st.success(result.get("message", MESSAGES["send_success"]))
                    else:
                        st.error(MESSAGES["error"].format("Failed to send"))
            except Exception as e:
                logger.error(f"Send error: {e}")
                st.error(MESSAGES["error"].format(str(e)))

    with col2:
        st.write("")  # Spacing for alignment


def render_batch_generation(st) -> None:
    """Render batch generation UI.

    Args:
        st: Streamlit module
    """
    if st.button(BUTTON_LABELS["batch"], key="batch_btn", use_container_width=True):
        progress_bar = st.progress(0)
        status_text = st.empty()
        stats_container = st.container()

        successful = 0
        failed = 0

        try:
            for juz in range(1, 31):
                status_text.info(MESSAGES["batch"].format(juz))

                try:
                    # generate_and_cache returns (image_bytes, file_path)
                    image_bytes, image_path = generate_and_cache(juz, force=False)
                    if image_bytes and image_path:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Batch generation failed for Juz {juz}: {e}")
                    failed += 1

                progress = juz / 30
                progress_bar.progress(progress)

            progress_bar.progress(1.0)
            status_text.success(MESSAGES["batch_complete"])

            with stats_container:
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("✅ Successful", successful)
                with col2:
                    st.metric("❌ Failed", failed)

        except Exception as e:
            logger.error(f"Batch generation error: {e}")
            status_text.error(MESSAGES["error"].format(str(e)))
