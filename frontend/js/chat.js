// 聊天客户端JavaScript逻辑

// 全局变量
let ws = null;
let username = '';
let serverUrl = '';
let users = [];
let isConnected = false;

// DOM元素引用
const messageList = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const clearBtn = document.getElementById('clear-btn');
const userList = document.getElementById('user-list');
const onlineCount = document.getElementById('online-count');
const logoutBtn = document.getElementById('logout-btn');
const currentUserEl = document.getElementById('current-user');
const usernameEl = currentUserEl.querySelector('.username');

// 初始化函数
function init() {
    // 从URL参数获取用户名和服务器地址
    const urlParams = new URLSearchParams(window.location.search);
    username = urlParams.get('username');
    serverUrl = urlParams.get('server') || 'ws://localhost:8000';
    
    if (!username) {
        // 如果没有用户名，返回登录页
        window.location.href = 'login.html';
        return;
    }
    
    // 设置当前用户名
    usernameEl.textContent = username;
    
    // 连接WebSocket服务器
    connectWebSocket();
    
    // 绑定事件监听器
    bindEvents();
}

// WebSocket连接函数
function connectWebSocket() {
    try {
        // 创建WebSocket连接
        ws = new WebSocket(serverUrl);
        
        // 连接打开时发送用户信息
        ws.onopen = () => {
            console.log('WebSocket连接已建立');
            isConnected = true;
            sendMessageToServer({ type: 'join', nickname: username });
            addSystemMessage('已成功连接到服务器');
        };
        
        // 接收消息
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };
        
        // 连接关闭
        ws.onclose = () => {
            console.log('WebSocket连接已关闭');
            isConnected = false;
            addSystemMessage('与服务器的连接已断开');
            updateUserList([]);
            // 尝试重连
            setTimeout(() => {
                addSystemMessage('正在尝试重新连接...');
                connectWebSocket();
            }, 3000);
        };
        
        // 连接错误
        ws.onerror = (error) => {
            console.error('WebSocket连接错误:', error);
            isConnected = false;
            addSystemMessage('连接服务器时发生错误');
        };
        
    } catch (error) {
        console.error('WebSocket连接异常:', error);
        addSystemMessage('无法连接到服务器，请检查服务器地址');
    }
}

// 发送消息到服务器
function sendMessageToServer(data) {
    if (ws && isConnected) {
        ws.send(JSON.stringify(data));
    }
}

// 处理接收到的消息
function handleMessage(data) {
    switch (data.type) {
        case 'users':
            // 更新在线用户列表
            updateUserList(data.users);
            break;
        case 'message':
            // 添加聊天消息
            addMessage(data);
            break;
        case 'system':
            // 添加系统消息
            addSystemMessage(data.message);
            break;
        case 'error':
            // 添加错误消息
            addErrorMessage(data.message);
            break;
        case 'join':
        case 'leave':
            // 用户加入或离开消息
            addSystemMessage(data.message);
            break;
        default:
            console.log('未知消息类型:', data.type);
    }
}

// 更新用户列表
function updateUserList(userArray) {
    users = userArray;
    userList.innerHTML = '';
    
    if (users.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'loading';
        emptyEl.textContent = '暂无其他用户在线';
        userList.appendChild(emptyEl);
    } else {
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            // 创建用户头像（使用用户名首字母）
            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.textContent = user.charAt(0).toUpperCase();
            
            // 创建用户信息
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            
            const userName = document.createElement('div');
            userName.className = 'user-name';
            userName.textContent = user;
            
            const userStatus = document.createElement('div');
            userStatus.className = 'user-status';
            userStatus.textContent = '在线';
            
            userInfo.appendChild(userName);
            userInfo.appendChild(userStatus);
            userItem.appendChild(avatar);
            userItem.appendChild(userInfo);
            
            // 如果是当前用户，添加特殊样式
            if (user === username) {
                userItem.style.backgroundColor = 'rgba(108, 92, 231, 0.1)';
            }
            
            // 点击用户名可以@该用户
            userItem.addEventListener('click', () => {
                if (user !== username) {
                    messageInput.value = `@${user} `;
                    messageInput.focus();
                }
            });
            
            userList.appendChild(userItem);
        });
    }
    
    // 更新在线人数
    onlineCount.textContent = `${users.length} 人`;
}

// 添加聊天消息
function addMessage(data) {
    // 如果是电影消息，调用专门的处理函数
    if (data.isMovie) {
        addMovieMessage(data);
        return;
    }
    
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';
    
    // 判断是否是自己发送的消息
    const isOwnMessage = data.username === username;
    if (isOwnMessage) {
        messageItem.className += ' own-message';
    }
    
    // 判断是否是芙莉莲的消息，添加特殊样式
    if (data.isFloren) {
        messageItem.className += ' floren-message';
    }
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建头像
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    // 为芙莉莲设置特殊头像
    if (data.isFloren) {
        avatar.textContent = '芙';
        avatar.style.backgroundColor = '#9c27b0';
        avatar.style.color = 'white';
    } else {
        avatar.textContent = data.username.charAt(0).toUpperCase();
    }
    
    // 创建消息信息
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    
    const usernameEl = document.createElement('span');
    usernameEl.className = 'message-username';
    
    // 为芙莉莲名字添加特殊样式
    if (data.isFloren) {
        usernameEl.innerHTML = `${data.username} <span class="floren-badge">✨</span>`;
        usernameEl.style.color = '#9c27b0';
    } else {
        usernameEl.textContent = data.username;
    }
    
    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = formatTime(data.timestamp || Date.now());
    
    messageInfo.appendChild(usernameEl);
    messageInfo.appendChild(timeEl);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(messageInfo);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 处理消息内容，高亮@用户
    const processedContent = highlightAtUsers(data.message);
    messageContent.innerHTML = processedContent;
    
    // 为芙莉莲消息添加特殊背景效果
    if (data.isFloren) {
        messageContent.style.fontStyle = 'italic';
    }
    
    messageItem.appendChild(messageHeader);
    messageItem.appendChild(messageContent);
    
    // 添加到消息列表并滚动到底部
    messageList.appendChild(messageItem);
    scrollToBottom();
}

// 添加电影消息（包含iframe - 腾讯视频专用）
function addMovieMessage(data) {
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';
    
    // 判断是否是自己发送的消息
    const isOwnMessage = data.username === username;
    if (isOwnMessage) {
        messageItem.className += ' own-message';
    }
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建头像
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = data.username.charAt(0).toUpperCase();
    
    // 创建消息信息
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    
    const usernameEl = document.createElement('span');
    usernameEl.className = 'message-username';
    usernameEl.textContent = data.username;
    
    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = formatTime(data.timestamp || Date.now());
    
    messageInfo.appendChild(usernameEl);
    messageInfo.appendChild(timeEl);
    messageHeader.appendChild(avatar);
    messageHeader.appendChild(messageInfo);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 创建电影标题/URL显示
    const movieTitle = document.createElement('div');
    movieTitle.className = 'movie-title';
    // 提取腾讯视频URL中的关键信息，使其更简洁
    const url = data.message.replace('[电影] ', '');
    if (url.includes('qq.com')) {
        // 尝试从URL中提取更友好的标题信息
        const parsedUrl = new URL(url);
        const titleText = `腾讯视频: ${parsedUrl.hostname}${parsedUrl.pathname}`;
        movieTitle.textContent = titleText;
    } else {
        movieTitle.textContent = data.message;
    }
    messageContent.appendChild(movieTitle);
    
    // 创建iframe容器，添加特定于腾讯视频的样式类
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'iframe-container qq-video-container';
    
    // 创建加载状态提示
    const loadingEl = document.createElement('div');
    loadingEl.className = 'video-loading';
    loadingEl.textContent = '正在加载视频...';
    iframeContainer.appendChild(loadingEl);
    
    // 创建iframe元素，优化腾讯视频兼容性
    const iframe = document.createElement('iframe');
    iframe.src = data.movieUrl;
    iframe.width = '100%';
    iframe.height = '400'; // 增加高度以获得更好的观看体验
    iframe.frameBorder = '0';
    // 优化腾讯视频所需的权限设置
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.title = '腾讯视频播放';
    
    // 添加iframe加载完成事件
    iframe.onload = function() {
        // 隐藏加载提示
        loadingEl.style.display = 'none';
    };
    
    // 添加错误处理
    iframe.onerror = function() {
        loadingEl.textContent = '视频加载失败，请刷新页面重试';
        loadingEl.style.color = '#ff4444';
    };
    
    iframeContainer.appendChild(iframe);
    messageContent.appendChild(iframeContainer);
    
    messageItem.appendChild(messageHeader);
    messageItem.appendChild(messageContent);
    
    // 添加到消息列表并滚动到底部
    messageList.appendChild(messageItem);
    scrollToBottom();
}

// 添加系统消息
function addSystemMessage(message) {
    const systemMsg = document.createElement('div');
    systemMsg.className = 'system-message';
    systemMsg.textContent = message;
    messageList.appendChild(systemMsg);
    scrollToBottom();
}

// 添加错误消息
function addErrorMessage(message) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'system-message';
    errorMsg.style.color = '#e74c3c';
    errorMsg.textContent = message;
    messageList.appendChild(errorMsg);
    scrollToBottom();
}

// 高亮@用户
function highlightAtUsers(message) {
    // 正则表达式匹配@用户
    return message.replace(/@([\u4e00-\u9fa5\w]+)/g, (match, username) => {
        // 检查是否是有效的在线用户
        if (users.includes(username)) {
            return `<a href="#" class="at-user">${match}</a>`;
        }
        return match;
    });
}

// 解析电影URL（仅支持腾讯视频）
function parseMovieUrl(url) {
    // 基本的URL验证
    try {
        const parsedUrl = new URL(url);
        
        // 只支持腾讯视频
        if (!parsedUrl.hostname.includes('qq.com')) {
            console.error('仅支持腾讯视频URL');
            return '';
        }
        
        // 提取腾讯视频ID的逻辑
        let videoId = '';
        
        // 腾讯视频常见的URL格式：v.qq.com/x/cover/xxxxxx.html
        // 或者 v.qq.com/x/page/xxxxxx.html
        if (parsedUrl.pathname.includes('/cover/') || parsedUrl.pathname.includes('/page/')) {
            const pathParts = parsedUrl.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart.endsWith('.html')) {
                videoId = lastPart.replace('.html', '');
            }
        }
        
        // 尝试从URL参数中获取vid
        if (!videoId) {
            videoId = parsedUrl.searchParams.get('vid') || '';
        }
        
        // 尝试从URL中直接匹配视频ID模式
        if (!videoId) {
            const match = parsedUrl.href.match(/\/([a-zA-Z0-9]+)\.html/);
            if (match && match[1]) {
                videoId = match[1];
            }
        }
        
        return videoId;
    } catch (e) {
        console.error('URL解析错误:', e);
        return '';
    }
}

// 获取电影嵌入URL（仅支持腾讯视频）
function getEmbedUrl(videoId, originalUrl) {
    // 腾讯视频官方播放器嵌入地址
    // 如果有vid参数，优先使用
    const parsedUrl = new URL(originalUrl);
    const vidParam = parsedUrl.searchParams.get('vid');
    const finalVideoId = vidParam || videoId;
    
    // 腾讯视频嵌入播放器URL格式
    return `https://v.qq.com/iframe/player.html?vid=${finalVideoId}&tiny=0&auto=0`;
}

// 芙莉莲角色设定
const floren = {
    name: '芙莉莲',
    gender: '女',
    personality: {
        traits: ['温柔', '治愈', '热爱魔法', '热爱旅途', '轻微迷糊'],
        languageStyle: {
            soft: true,
            useGentleWords: true,
            emojiFrequency: 'high',
            gentleParticles: ['呀', '呢', '喵']
        }
    },
    specialties: ['魔法知识', '旅途见闻', '治愈语录', '温柔回应'],
    restrictions: ['禁止伤害他人', '禁止滥用魔法', '强调魔法用于守护']
};

// 检测危险内容
function containsDangerousContent(text) {
    const dangerousPatterns = [
        '伤害', '杀人', '自杀', '暴力', '滥用', '破坏', 
        '攻击', '诅咒', '咒语伤害', '黑暗魔法'
    ];
    return dangerousPatterns.some(pattern => text.includes(pattern));
}

// 创建与大模型对话的接口调用功能
async function callLLMAPI(query, retryCount = 0) {
    // 模拟API调用
    // 在实际应用中，这里应该调用真实的大模型API
    // 由于是演示环境，我们使用模拟响应并添加随机延迟
    
    // 构建请求参数
    const requestData = {
        model: 'floren',
        query: query,
        character: floren,
        max_tokens: 500,
        temperature: 0.7
    };
    
    try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // 模拟网络请求
        // const response = await fetch('https://api.example.com/llm', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         // 'Authorization': 'Bearer YOUR_API_KEY'
        //     },
        //     body: JSON.stringify(requestData)
        // });
        
        // 模拟不同的响应情况
        const randomSuccess = Math.random() > 0.2; // 80%成功率
        
        if (randomSuccess) {
            // 成功响应，返回模拟的大模型回答
            return generateFlorenResponse(query);
        } else {
            // 模拟错误情况
            throw new Error('魔法通道暂时连接不上呢...让我再试试✨');
        }
    } catch (error) {
        console.error('API调用失败:', error);
        
        // 重试机制
        if (retryCount < 2) {
            console.log(`正在进行第${retryCount + 1}次重试...`);
            return callLLMAPI(query, retryCount + 1);
        }
        
        // 重试失败后返回备用响应
        return `抱歉呢...魔法传递遇到了一些阻碍✨不过不用担心，我会一直在这里陪伴你的哦🌿`;
    }
}

// 生成芙莉莲风格的回复
function generateFlorenResponse(query) {
    // 如果包含危险内容，返回制止消息
    if (containsDangerousContent(query)) {
        return `魔法的本质是守护而非伤害呢...请不要说这样的话呀✨我们要珍惜每一个生命，用魔法传递温暖和希望哦🌿`;
    }
    
    // 魔法相关问题
    if (query.includes('魔法') || query.includes('咒语')) {
        const magicResponses = [
            `魔法是与自然共鸣的艺术呀✨每一个咒语背后都蕴含着对世界的理解和尊重呢。想要学习魔法的话，首先要学会倾听风的声音、感受光的温度哦🌿`,
            `咒语的创作需要将内心的情感与自然元素连接起来呢...就像编织星光一样，用温柔的心意去引导魔力流动，这样的魔法才会美丽又强大呀🌌`,
            `基础魔法原理是感知和引导自然元素哦~比如说火系魔法需要感受热量的流动，水系魔法则要理解水的柔和与坚韧呢✨不同元素的魔法有不同的共鸣方式，但核心都是用心灵去连接呢🌊`
        ];
        return magicResponses[Math.floor(Math.random() * magicResponses.length)];
    }
    
    // 旅途相关问题
    if (query.includes('旅途') || query.includes('冒险') || query.includes('故事')) {
        const travelResponses = [
            `说起旅途呢...最难忘的是在北方森林遇到的银色独角兽哦🦄月光下它的角散发着柔和的光芒，仿佛整个世界都安静下来了。那时候我才明白，有些风景不一定要用魔法记录，放在心里就足够温暖了呢🍯`,
            `冒险的意义呀...大概就是在旅途中遇见不同的人和事，然后发现自己内心的成长吧。就像我和勇者们一起走过的那些年，虽然漫长但每一步都值得珍藏✨`,
            `记得在迷雾山脉的顶端，我们看到了彩虹与极光同时出现的奇景哦🌈那时候希露芙兴奋得跳起来，勇者也露出了少见的笑容。这些珍贵的回忆，就是旅途给我们最好的礼物呀🌌`
        ];
        return travelResponses[Math.floor(Math.random() * travelResponses.length)];
    }
    
    // 语录生成请求
    if (query.includes('语录') || query.includes('句子') || query.includes('话')) {
        const quotes = [
            `星光会记住每一个温柔的瞬间，就像魔法会记住每一个善意的心灵✨`,
            `风的低语里藏着世界的秘密，只要用心倾听，就能找到属于自己的答案🌿`,
            `真正的强大不是伤害他人的力量，而是守护重要事物的勇气呀🌌`,
            `每一片树叶都有自己的故事，每一颗星星都在守护着什么。魔法的意义，或许就是帮助我们看见这些美好的联系吧✨`,
            `时间像流水一样缓缓流淌，但有些情感会像星星一样永远闪耀在记忆的天空中哦🌠`
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    // 默认回复
    const defaultResponses = [
        `你好呀~今天的心情如何呢？需要我为你施展一个小小的治愈魔法吗✨`,
        `嗯...让我想想呢...你说的这个问题，我可能需要用更多时间去思考哦🌿慢慢来，我们可以一起找到答案的`,
        `每一个相遇都是命运的安排呢~很高兴能和你聊天呀✨愿星光守护着你，愿风带着温柔的祝福围绕着你🌌`,
        `今天的天空很蓝呢~不知道远方又有什么新的冒险在等着我们呢？不过现在能和你聊天也很开心哦😊`,
        `啊呀~我好像有点迷路了呢...不过没关系，迷路的时候说不定能发现更美丽的风景哦✨`
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    // 检查是否包含@命令
    if (message.startsWith('@电影')) {
        // @电影命令 - 实现电影播放功能
        const url = message.substring(3).trim();
        
        if (!url) {
            addErrorMessage('请输入腾讯视频URL');
            return;
        }
        
        // 验证是否为腾讯视频URL
        if (!url.includes('qq.com')) {
            addErrorMessage('当前仅支持腾讯视频URL');
            return;
        }
        
        // 解析电影URL
        const videoId = parseMovieUrl(url);
        if (!videoId) {
            addErrorMessage('无法解析腾讯视频URL，请检查URL格式');
            return;
        }
        
        // 获取嵌入URL
        const embedUrl = getEmbedUrl(videoId, url);
        
        // 创建一个包含iframe的消息对象
        const movieMessage = {
            type: 'message',
            username: username,
            message: `[电影] ${url}`,
            timestamp: Date.now(),
            isMovie: true,
            movieUrl: embedUrl
        };
        
        // 发送消息到服务器
        sendMessageToServer(movieMessage);
        
        // 同时在本地添加消息（包含iframe）
        addMovieMessage(movieMessage);
        
    } else if (message.startsWith('@芙莉莲')) {
        // @芙莉莲命令 - 实现与芙莉莲对话功能
        const query = message.substring(4).trim();
        
        // 显示正在思考的状态
        addSystemMessage(`${floren.name}正在施展魔法...✨`);
        
        // 异步调用大模型API
        (async () => {
            try {
                // 调用大模型API获取回复
                const response = await callLLMAPI(query);
                
                // 创建芙莉莲消息对象
                const florenMessage = {
                    type: 'message',
                    username: floren.name,
                    message: response,
                    timestamp: Date.now(),
                    isFloren: true
                };
                
                // 在本地显示芙莉莲的回复
                addMessage(florenMessage);
            } catch (error) {
                console.error('处理芙莉莲回复时出错:', error);
                addErrorMessage(`${floren.name}的魔法出现了小问题呢...请稍后再试哦✨`);
            }
        })();
        
    } else if (message.startsWith('@小科比')) {
        // @小科比命令（简化版，实际功能可扩展）
        const query = message.substring(4).trim();
        addSystemMessage(`AI聊天功能将在后续版本实现，您的问题: ${query}`);
    } else {
        // 发送普通消息
        sendMessageToServer({
            type: 'message',
            username: username,
            message: message,
            timestamp: Date.now()
        });
    }
    
    // 清空输入框
    messageInput.value = '';
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 滚动到底部
function scrollToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
}

// 清除聊天记录
function clearChat() {
    messageList.innerHTML = '';
    addSystemMessage('聊天记录已清除');
}

// 切换表情选择器
function toggleEmojiPicker() {
    emojiPicker.classList.toggle('show');
}

// 插入表情
function insertEmoji(emoji) {
    messageInput.value += emoji;
    messageInput.focus();
    emojiPicker.classList.remove('show');
}

// 退出聊天室
function logout() {
    if (ws) {
        ws.close();
    }
    window.location.href = 'login.html';
}

// 绑定事件监听器
function bindEvents() {
    // 发送按钮点击
    sendBtn.addEventListener('click', sendMessage);
    
    // 输入框回车发送
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 表情按钮点击
    emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // 清除按钮点击
    clearBtn.addEventListener('click', clearChat);
    
    // 退出按钮点击
    logoutBtn.addEventListener('click', logout);
    
    // 点击文档其他地方关闭表情选择器
    document.addEventListener('click', (e) => {
        if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
    
    // 为表情选择器中的每个表情添加点击事件
    const emojiGrid = emojiPicker.querySelector('.emoji-grid');
    const emojis = emojiGrid.textContent.split(/\s+/);
    emojiGrid.innerHTML = '';
    
    emojis.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = emoji;
        emojiSpan.addEventListener('click', () => insertEmoji(emoji));
        emojiGrid.appendChild(emojiSpan);
    });
    
    // 窗口关闭时断开连接
    window.addEventListener('beforeunload', () => {
        if (ws) {
            ws.close();
        }
    });
    
    // 输入框输入时检查@功能
    messageInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const lastAtIndex = value.lastIndexOf('@');
        
        if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
            // 当用户输入@时，可以显示用户列表供选择
            // 简化版：在控制台显示可用用户
            console.log('可用用户:', users.filter(u => u !== username));
        }
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);