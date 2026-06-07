// =============================================
// 🔈 voice.js — AI 角色對話朗讀系統
// =============================================

const VoiceSystem = (() => {

    const CHARACTER_PROFILES = {
        "阿海":   { pitch: 0.10, rate: 0.88, volume: 1.0 },
        "波哥":   { pitch: 0.20, rate: 0.80, volume: 1.0 },
        "龍船長": { pitch: 0.05, rate: 1.20, volume: 1.0 },
        "琳博士": { pitch: 1.90, rate: 0.85, volume: 1.0 },
        "婷婷":   { pitch: 2.20, rate: 0.95, volume: 1.0 },
        "春嬌姨": { pitch: 1.60, rate: 1.25, volume: 1.0 },
    };

    let _enabled = false;
    let _voice_zh = null;
    let _voiceLoaded = false;

    function _loadVoice() {
        if (_voiceLoaded) return;
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;
        _voice_zh =
            voices.find(v => v.lang === 'zh-TW') ||
            voices.find(v => v.lang === 'zh-HK') ||
            voices.find(v => v.lang.startsWith('zh')) ||
            null;
        _voiceLoaded = true;
    }

    function speak(text, charName) {
        if (!_enabled) return;
        if (!text || !text.trim()) return;

        const clean = text
            .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
            .replace(/[\u{2600}-\u{27BF}]/gu,   '')
            .trim();
        if (!clean) return;

        _loadVoice();

        const prof = CHARACTER_PROFILES[charName];
        if (!prof) return;

        window.speechSynthesis.cancel();

        const utt = new SpeechSynthesisUtterance(clean);
        utt.lang   = 'zh-TW';
        utt.pitch  = prof.pitch;
        utt.rate   = prof.rate;
        utt.volume = prof.volume;
        if (_voice_zh) utt.voice = _voice_zh;

        window.speechSynthesis.speak(utt);
    }

    function setEnabled(val) {
        _enabled = val;
        if (!val) window.speechSynthesis.cancel();
    }

    function isEnabled() { return _enabled; }

    function init() {
        _loadVoice();
        if ('onvoiceschanged' in window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                _voice_zh = null;
                _voiceLoaded = false;
                _loadVoice();
            };
        }
    }

    return { speak, setEnabled, isEnabled, init };

})();

VoiceSystem.init();
