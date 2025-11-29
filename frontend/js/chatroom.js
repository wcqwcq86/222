document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const messageList = document.getElementById('message-list');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const usersList = document.getElementById('users-list');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const currentUser = document.getElementById('current-user');
    
    let websocket = null;
    let userInfo = null;
    let reconnectInterval = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // 加载用户信息
    function loadUserInfo() {
        const savedUser = localStorage.getItem('chat_user');
        if (!savedUser) {
            alert('请先登录');
            window.location.href = 'login.html';
            return null;
        }
        
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            alert('用户信息无效，请重新登录');
            localStorage.removeItem('chat_user');
            window.location.href = 'login.html';
            return null;
        }
    }
    
    // 连接到服务器
    function connectToServer() {
        if (isConnected || !userInfo) {
            return;
        }
        
        try {
            websocket = new WebSocket(userInfo.serverUrl);
            
            websocket.onopen = () => {
                console.log('WebSocket连接已建立');
                isConnected = true;
                reconnectAttempts = 0;
                
                // 发送登录消息
                const loginMessage = {
                    type: 'login',
                    nickname: userInfo.nickname,
                    timestamp: new Date().getTime()
                };
                websocket.send(JSON.stringify(loginMessage));
                
                // 更新UI状态
                disconnectBtn.textContent = '断开连接';
                sendBtn.disabled = false;
                messageInput.disabled = false;
                
                // 添加系统消息
                addSystemMessage('已成功连接到服务器');
            };
            
            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (error) {
                    console.error('解析消息失败:', error);
                    addErrorMessage('接收到无效的消息格式');
                }
            };
            
            websocket.onclose = (event) => {
                console.log('WebSocket连接已关闭', event);
                isConnected = false;
                
                // 更新UI状态
                disconnectBtn.textContent = '连接中...';
                sendBtn.disabled = true;
                messageInput.disabled = true;
                
                // 清空用户列表
                usersList.innerHTML = '';
                
                // 添加系统消息
                if (!event.wasClean) {
                    addSystemMessage('连接意外断开，正在尝试重新连接...');
                    handleReconnect();
                } else {
                    addSystemMessage('已断开与服务器的连接');
                }
            };
            
            websocket.onerror = (error) => {
                console.error('WebSocket错误:', error);
                addErrorMessage('连接发生错误');
            };
            
        } catch (error) {
            console.error('创建WebSocket连接失败:', error);
            addErrorMessage('无法建立连接，请检查网络或服务器状态');
            handleReconnect();
        }
    }
    
    // 处理重连
    function handleReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            clearInterval(reconnectInterval);
            addErrorMessage('达到最大重连次数，请手动刷新页面或重新登录');
            disconnectBtn.textContent = '重新连接';
            return;
        }
        
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                reconnectAttempts++;
                addSystemMessage(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts})...`);
                connectToServer();
                
                if (reconnectAttempts >= maxReconnectAttempts) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            }, 3000); // 每3秒尝试重连一次
        }
    }
    
    // 处理接收到的消息
    function handleMessage(data) {
        switch (data.type) {
            case 'login_success':
                currentUser.textContent = `当前用户: ${userInfo.nickname}`;
                updateUserList(data.users || []);
                break;
                
            case 'message':
                addChatMessage(data);
                break;
                
            case 'system':
                addSystemMessage(data.message);
                break;
                
            case 'user_joined':
                addSystemMessage(`${data.nickname} 加入了聊天室`);
                updateUserList(data.users || []);
                break;
                
            case 'user_left':
                addSystemMessage(`${data.nickname} 离开了聊天室`);
                updateUserList(data.users || []);
                break;
                
            case 'users_update':
                updateUserList(data.users || []);
                break;
                
            case 'error':
                addErrorMessage(data.message);
                break;
                
            default:
                console.log('未知消息类型:', data);
                break;
        }
    }
    
    // 添加聊天消息
    function addChatMessage(message) {
        const isOwnMessage = message.nickname === userInfo.nickname;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="nickname">${message.nickname}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${escapeHTML(message.content)}</div>
        `;
        
        messageList.appendChild(messageElement);
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 添加系统消息
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.textContent = message;
        
        messageList.appendChild(messageElement);
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 添加错误消息
    function addErrorMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message error';
        messageElement.textContent = message;
        
        messageList.appendChild(messageElement);
        messageList.scrollTop = messageList.scrollHeight;
    }
    
    // 更新用户列表
    function updateUserList(users) {
        usersList.innerHTML = '';
        
        if (users.length === 0) {
            const emptyElement = document.createElement('li');
            emptyElement.className = 'empty-list';
            emptyElement.textContent = '暂无其他用户在线';
            usersList.appendChild(emptyElement);
        } else {
            users.forEach(user => {
                const userElement = document.createElement('li');
                userElement.className = user === userInfo.nickname ? 'current-user' : '';
                userElement.textContent = user;
                usersList.appendChild(userElement);
            });
        }
    }
    
    // 发送消息
    function sendMessage() {
        const content = messageInput.value.trim();
        
        if (!content || !isConnected) {
            return;
        }
        
        const message = {
            type: 'message',
            nickname: userInfo.nickname,
            content: content,
            timestamp: new Date().getTime()
        };
        
        try {
            websocket.send(JSON.stringify(message));
            messageInput.value = '';
        } catch (error) {
            console.error('发送消息失败:', error);
            addErrorMessage('发送消息失败，请重试');
        }
    }
    
    // 断开连接
    function disconnect() {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        if (websocket) {
            websocket.close();
            websocket = null;
        }
        
        isConnected = false;
        disconnectBtn.textContent = '已断开';
    }
    
    // HTML转义函数，防止XSS攻击
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 事件监听器
    sendBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    disconnectBtn.addEventListener('click', () => {
        if (isConnected) {
            if (confirm('确定要断开连接吗？')) {
                disconnect();
                localStorage.removeItem('chat_user');
                window.location.href = 'login.html';
            }
        } else if (disconnectBtn.textContent === '重新连接') {
            reconnectAttempts = 0;
            connectToServer();
        }
    });
    
    // 页面关闭时清理连接
    window.addEventListener('beforeunload', () => {
        disconnect();
    });
    
    // 初始化
    userInfo = loadUserInfo();
    if (userInfo) {
        connectToServer();
    }
    
    // 自动聚焦输入框
    messageInput.focus();
});