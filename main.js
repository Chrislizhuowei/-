let scene, camera, renderer, particles;
let audioContext, analyser, dataArray, source;
const particleCount = 2000;

// 初始化Three.js场景
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 创建粒子系统
    particles = new THREE.Group();
    
    // 创建基础几何体
    const particleGeometry = new THREE.BoxGeometry(2, 2, 2);
    const particleMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        specular: 0x444444
    });

    // 添加光源
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    // 创建粒子
    for(let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        
        // 随机分布粒子在球体中
        const radius = 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
        particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
        particle.position.z = radius * Math.cos(phi);
        
        // 随机初始旋转
        particle.rotation.x = Math.random() * Math.PI;
        particle.rotation.y = Math.random() * Math.PI;
        particle.rotation.z = Math.random() * Math.PI;
        
        // 存储原始位置用于动画
        particle.userData.originalPosition = particle.position.clone();
        
        particles.add(particle);
    }

    scene.add(particles);
    camera.position.z = 300;

    // 设置音频处理
    setupAudio();
    
    // 添加窗口大小调整监听
    window.addEventListener('resize', onWindowResize, false);
}

// 设置音频分析器
function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = function(e) {
            audioContext.decodeAudioData(e.target.result)
                .then(function(buffer) {
                    if (source) {
                        source.stop();
                        source.disconnect();
                    }
                    source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(analyser);
                    analyser.connect(audioContext.destination);
                    source.start(0);
                })
                .catch(function(err) {
                    console.error('Error decoding audio data:', err);
                    alert('无法播放该音频文件，请尝试其他文件');
                });
        };
        
        reader.onerror = function(err) {
            console.error('Error reading file:', err);
            alert('读取文件时出错，请重试');
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 更新粒子位置和颜色
function updateParticles() {
    analyser.getByteFrequencyData(dataArray);

    particles.children.forEach((particle, i) => {
        const frequency = dataArray[i % analyser.frequencyBinCount] / 255;
        
        // 获取原始位置
        const originalPos = particle.userData.originalPosition;
        
        // 根据音频数据调整粒子位置
        const scale = 1 + frequency * 1.5;  // 缩放因子
        particle.position.copy(originalPos).multiplyScalar(scale);
        
        // 根据频率调整粒子旋转
        particle.rotation.x += frequency * 0.1;
        particle.rotation.y += frequency * 0.1;
        
        // 根据频率调整颜色
        particle.material.color.setHSL(frequency, 0.7, 0.5);
        particle.material.emissive.setHSL(frequency, 0.7, 0.2);
    });
}

// 窗口大小调整处理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    if (particles) {
        particles.rotation.x += 0.0005;
        particles.rotation.y += 0.001;
        updateParticles();
    }
    
    renderer.render(scene, camera);
}

// 启动应用
init();
animate(); 