document.addEventListener('DOMContentLoaded', function() {
    const nicknameInput = document.getElementById('nickname');
    const serverSelect = document.getElementById('server');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    
    // 加载服务器配置
    function loadServerConfig() {
        fetch('../config.json')
            .then(response => response.json())
            .then(config => {
                // 清空当前选项
                serverSelect.innerHTML = '';
                
                // 添加服务器选项
                config.servers.forEach(server => {
                    const option = document.createElement('option');
                    option.value = server.address || server.url; // 支持address或url字段
                    option.textContent = server.name;
                    serverSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('加载服务器配置失败:', error);
                // 如果配置文件不存在或加载失败，使用默认服务器
                serverSelect.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = 'ws://localhost:8000';
                defaultOption.textContent = '本地服务器 (默认)';
                serverSelect.appendChild(defaultOption);
            });
    }
    
    // 验证表单
    function validateForm() {
        const nickname = nicknameInput.value.trim();
        const serverUrl = serverSelect.value;
        
        errorMessage.textContent = '';
        
        if (!nickname) {
            errorMessage.textContent = '请输入昵称';
            return false;
        }
        
        if (nickname.length < 2 || nickname.length > 20) {
            errorMessage.textContent = '昵称长度应为2-20个字符';
            return false;
        }
        
        if (!serverUrl) {
            errorMessage.textContent = '请选择服务器';
            return false;
        }
        
        return true;
    }
    
    // 处理登录
    function handleLogin() {
        if (!validateForm()) {
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        const serverUrl = serverSelect.value;
        
        // 将用户信息作为URL参数传递给聊天室页面
        window.location.href = `chatroom.html?username=${encodeURIComponent(nickname)}&server=${encodeURIComponent(serverUrl)}`;
    }
    
    // 事件监听
    loginBtn.addEventListener('click', handleLogin);
    
    // 按Enter键登录
    nicknameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    serverSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // 初始化：加载服务器配置
    loadServerConfig();
    
    // 自动聚焦昵称输入框
    nicknameInput.focus();
});