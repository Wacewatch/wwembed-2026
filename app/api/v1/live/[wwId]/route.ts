<?php
// Vérifier si l'URL de la vidéo a été passée en paramètre
if (isset($_GET['url'])) {
    $video_url = $_GET['url'];

    // Vérifier si l'URL de la vidéo est valide
    if (filter_var($video_url, FILTER_VALIDATE_URL)) {
        // L'URL est valide
    } else {
        echo "URL de vidéo invalide.";
        exit();
    }
} else {
    echo "Aucune vidéo à lire.";
    exit();
}

// Fonction pour vérifier si c'est un fichier MP4
function is_video($url) {
    return preg_match('/\.(mp4|mkv|avi|flv|webm)$/i', $url);
}

// Fonction pour vérifier si c'est un fichier M3U/M3U8
function is_m3u($url) {
    return preg_match('/\.m3u8?$/i', $url) || strpos($url, 'm3u8') !== false;
}

// Fonction pour vérifier si l'URL est un JSON Netfree
function is_netfree_json($url) {
    return strpos($url, 'netfree2.cc/mobile/playlist.php') !== false;
}

// Si l'URL est un JSON Netfree, récupérer l'URL de la vidéo depuis la réponse JSON
if (is_netfree_json($video_url)) {
    $json_data = file_get_contents($video_url);
    $json = json_decode($json_data, true);

    if (isset($json['video_url'])) {
        $video_url = $json['video_url'];
    } else {
        echo "Aucune URL vidéo trouvée dans le JSON.";
        exit();
    }
}

// Déterminer si on utilise le proxy
$use_proxy = isset($_GET['proxy']) ? $_GET['proxy'] == '1' : true;
$proxied_url = 'proxy.php?url=' . urlencode($video_url);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lecteur Vidéo Universel</title>
    
    <!-- Video.js -->
    <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
    <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
    
    <!-- HLS.js (meilleure compatibilité) -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12"></script>
    
    <!-- Plyr (player alternatif moderne) -->
    <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
    <script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
    
    <!-- DPlayer (support IPTV et HLS) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer@1.27.1/dist/DPlayer.min.css">
    <script src="https://cdn.jsdelivr.net/npm/dplayer@1.27.1/dist/DPlayer.min.js"></script>
    
    <!-- Clappr (player flexible) -->
    <script src="https://cdn.jsdelivr.net/npm/clappr@latest/dist/clappr.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/level-selector@latest/dist/level-selector.min.js"></script>
    
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            background-color: #000;
            font-family: Arial, sans-serif;
        }

        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .controls-bar {
            background: #1a1a1a;
            padding: 10px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            z-index: 1000;
        }

        .controls-bar button {
            padding: 8px 15px;
            background: #333;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .controls-bar button:hover {
            background: #555;
        }

        .controls-bar button.active {
            background: #4CAF50;
        }

        .controls-bar select {
            padding: 8px;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
        }

        .status {
            color: #fff;
            font-size: 12px;
            padding: 5px 10px;
            background: #222;
            border-radius: 4px;
        }

        .video-wrapper {
            flex: 1;
            position: relative;
            background-color: black;
            overflow: hidden;
        }

        .streamtales-iframe, .player-container {
            width: 100% !important;
            height: 100% !important;
            border: none;
            display: block;
        }

        video {
            width: 100% !important;
            height: 100% !important;
            display: block;
            background: #000;
        }

        .error-message {
            color: #ff6b6b;
            padding: 20px;
            text-align: center;
            background: #2d2d2d;
            border-radius: 8px;
            margin: 20px;
        }

        .loading {
            color: #4CAF50;
            text-align: center;
            padding: 20px;
            font-size: 18px;
        }

        #player-dplayer, #player-clappr {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>

<div class="container">
    <!-- Barre de contrôle -->
    <div class="controls-bar">
        <select id="player-selector" onchange="changePlayer()">
            <option value="hlsjs">HLS.js (Recommandé)</option>
            <option value="videojs">Video.js</option>
            <option value="plyr">Plyr</option>
            <option value="dplayer">DPlayer</option>
            <option value="clappr">Clappr</option>
            <option value="streamtales">StreamTales</option>
            <option value="native">HTML5 Native</option>
        </select>
        
        <button onclick="toggleProxy()" id="proxy-btn">
            Proxy: <span id="proxy-status"><?php echo $use_proxy ? 'ON' : 'OFF'; ?></span>
        </button>
        
        <button onclick="reloadPlayer()">🔄 Recharger</button>
        <button onclick="testDirectUrl()">🔗 Test Direct</button>
        <button onclick="testProxyUrl()">🔗 Test Proxy</button>
        
        <div class="status" id="status">Prêt</div>
    </div>

    <!-- Zone de lecture -->
    <div class="video-wrapper" id="video-wrapper">
        <div class="loading">Chargement du lecteur...</div>
    </div>
</div>

<script>
// Configuration globale
const CONFIG = {
    videoUrl: <?php echo json_encode($video_url); ?>,
    proxyUrl: <?php echo json_encode($proxied_url); ?>,
    useProxy: <?php echo $use_proxy ? 'true' : 'false'; ?>,
    isM3U8: <?php echo is_m3u($video_url) ? 'true' : 'false'; ?>,
    isVideo: <?php echo is_video($video_url) ? 'true' : 'false'; ?>
};

let currentPlayer = null;
let playerType = 'hlsjs';

// Fonction pour obtenir l'URL à utiliser
function getVideoUrl() {
    return CONFIG.useProxy ? CONFIG.proxyUrl : CONFIG.videoUrl;
}

// Changer de lecteur
function changePlayer() {
    playerType = document.getElementById('player-selector').value;
    reloadPlayer();
}

// Toggle proxy
function toggleProxy() {
    CONFIG.useProxy = !CONFIG.useProxy;
    document.getElementById('proxy-status').textContent = CONFIG.useProxy ? 'ON' : 'OFF';
    document.getElementById('proxy-btn').classList.toggle('active', CONFIG.useProxy);
    updateStatus('Proxy ' + (CONFIG.useProxy ? 'activé' : 'désactivé'));
}

// Mettre à jour le statut
function updateStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.color = isError ? '#ff6b6b' : '#4CAF50';
}

// Nettoyer le lecteur précédent
function cleanupPlayer() {
    const wrapper = document.getElementById('video-wrapper');
    
    if (currentPlayer) {
        try {
            if (typeof currentPlayer.destroy === 'function') {
                currentPlayer.destroy();
            } else if (typeof currentPlayer.dispose === 'function') {
                currentPlayer.dispose();
            }
        } catch (e) {
            console.error('Erreur lors du nettoyage:', e);
        }
    }
    
    wrapper.innerHTML = '';
    currentPlayer = null;
}

// Recharger le lecteur
function reloadPlayer() {
    cleanupPlayer();
    updateStatus('Chargement...');
    
    setTimeout(() => {
        switch(playerType) {
            case 'hlsjs':
                loadHlsJs();
                break;
            case 'videojs':
                loadVideoJs();
                break;
            case 'plyr':
                loadPlyr();
                break;
            case 'dplayer':
                loadDPlayer();
                break;
            case 'clappr':
                loadClappr();
                break;
            case 'streamtales':
                loadStreamTales();
                break;
            case 'native':
                loadNative();
                break;
        }
    }, 100);
}

// HLS.js (Recommandé pour M3U8)
function loadHlsJs() {
    const wrapper = document.getElementById('video-wrapper');
    const video = document.createElement('video');
    video.id = 'player-hlsjs';
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    wrapper.appendChild(video);
    
    if (Hls.isSupported()) {
        const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            xhrSetup: function(xhr, url) {
                xhr.withCredentials = false;
                xhr.setRequestHeader('User-Agent', 'Mozilla/5.0');
            }
        });
        
        hls.loadSource(getVideoUrl());
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            updateStatus('✓ Lecture avec HLS.js');
            video.play().catch(e => console.error('Autoplay error:', e));
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                updateStatus('❌ Erreur HLS: ' + data.type, true);
                console.error('Erreur HLS:', data);
            }
        });
        
        currentPlayer = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = getVideoUrl();
        updateStatus('✓ Lecture native HLS');
        video.play().catch(e => console.error('Autoplay error:', e));
    } else {
        updateStatus('❌ HLS non supporté', true);
    }
}

// Video.js
function loadVideoJs() {
    const wrapper = document.getElementById('video-wrapper');
    const video = document.createElement('video');
    video.id = 'player-videojs';
    video.className = 'video-js vjs-default-skin';
    video.controls = true;
    wrapper.appendChild(video);
    
    currentPlayer = videojs('player-videojs', {
        autoplay: true,
        muted: true,
        controls: true,
        fluid: true,
        html5: {
            hls: {
                withCredentials: false,
                overrideNative: true,
                enableLowInitialPlaylist: true,
                smoothQualityChange: true
            }
        },
        sources: [{
            src: getVideoUrl(),
            type: CONFIG.isM3U8 ? 'application/x-mpegURL' : 'video/mp4'
        }]
    });
    
    currentPlayer.ready(function() {
        updateStatus('✓ Lecture avec Video.js');
    });
    
    currentPlayer.on('error', function(e) {
        updateStatus('❌ Erreur Video.js', true);
        console.error('Erreur Video.js:', e);
    });
}

// Plyr
function loadPlyr() {
    const wrapper = document.getElementById('video-wrapper');
    const video = document.createElement('video');
    video.id = 'player-plyr';
    video.controls = true;
    wrapper.appendChild(video);
    
    if (CONFIG.isM3U8 && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(getVideoUrl());
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            currentPlayer = new Plyr(video, {
                autoplay: true,
                muted: true
            });
            updateStatus('✓ Lecture avec Plyr + HLS.js');
        });
    } else {
        video.src = getVideoUrl();
        currentPlayer = new Plyr(video, {
            autoplay: true,
            muted: true
        });
        updateStatus('✓ Lecture avec Plyr');
    }
}

// DPlayer
function loadDPlayer() {
    const wrapper = document.getElementById('video-wrapper');
    const container = document.createElement('div');
    container.id = 'player-dplayer';
    wrapper.appendChild(container);
    
    currentPlayer = new DPlayer({
        container: container,
        autoplay: true,
        video: {
            url: getVideoUrl(),
            type: CONFIG.isM3U8 ? 'hls' : 'auto'
        }
    });
    
    updateStatus('✓ Lecture avec DPlayer');
}

// Clappr
function loadClappr() {
    const wrapper = document.getElementById('video-wrapper');
    const container = document.createElement('div');
    container.id = 'player-clappr';
    wrapper.appendChild(container);
    
    currentPlayer = new Clappr.Player({
        source: getVideoUrl(),
        parentId: '#player-clappr',
        autoPlay: true,
        muted: true,
        height: '100%',
        width: '100%'
    });
    
    updateStatus('✓ Lecture avec Clappr');
}

// StreamTales
function loadStreamTales() {
    const wrapper = document.getElementById('video-wrapper');
    const iframe = document.createElement('iframe');
    iframe.className = 'streamtales-iframe';
    iframe.src = 'https://video.streamtales.cc/player/frvod.php?url=' + encodeURIComponent(CONFIG.videoUrl);
    iframe.allowFullscreen = true;
    wrapper.appendChild(iframe);
    
    updateStatus('✓ Lecture avec StreamTales');
}

// HTML5 Native
function loadNative() {
    const wrapper = document.getElementById('video-wrapper');
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.src = getVideoUrl();
    wrapper.appendChild(video);
    
    video.addEventListener('loadeddata', () => {
        updateStatus('✓ Lecture native HTML5');
    });
    
    video.addEventListener('error', (e) => {
        updateStatus('❌ Erreur lecture native', true);
        console.error('Erreur vidéo:', e);
    });
}

// Test de l'URL directe
function testDirectUrl() {
    updateStatus('Test de l\'URL directe...');
    fetch(CONFIG.videoUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
            updateStatus('✓ URL directe accessible');
            window.open(CONFIG.videoUrl, '_blank');
        })
        .catch(err => {
            updateStatus('❌ URL directe inaccessible', true);
            console.error('Erreur test direct:', err);
        });
}

// Test de l'URL proxy
function testProxyUrl() {
    updateStatus('Test du proxy...');
    fetch(CONFIG.proxyUrl)
        .then(response => {
            if (response.ok) {
                updateStatus('✓ Proxy fonctionnel');
                window.open(CONFIG.proxyUrl, '_blank');
            } else {
                updateStatus('❌ Proxy erreur: ' + response.status, true);
            }
        })
        .catch(err => {
            updateStatus('❌ Proxy inaccessible', true);
            console.error('Erreur test proxy:', err);
        });
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    // Activer le proxy par défaut
    document.getElementById('proxy-btn').classList.add('active');
    
    // Charger le lecteur par défaut
    reloadPlayer();
});
</script>

</body>
</html>
