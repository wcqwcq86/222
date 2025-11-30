import asyncio
import json
import logging
from datetime import datetime
import websockets

# 配置日志
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 存储活跃的WebSocket连接
connected_users = {}
# 存储在线用户昵称
online_users = set()

async def handle_client(websocket, path=None):
    """处理每个WebSocket客户端连接"""
    user_nickname = None
    
    try:
        # 等待用户登录消息
        async for message in websocket:
            try:
                data = json.loads(message)
                
                # 处理登录消息
                if data.get('type') == 'login' or data.get('type') == 'join':
                    user_nickname = data.get('nickname')
                    
                    if not user_nickname:
                        await websocket.send(json.dumps({
                            'type': 'error',
                            'message': '昵称不能为空'
                        }))
                        continue
                    
                    # 检查昵称唯一性
                    if user_nickname in online_users:
                        await websocket.send(json.dumps({
                            'type': 'error',
                            'message': '该昵称已被使用，请更换昵称'
                        }))
                        continue
                    
                    # 注册用户
                    connected_users[websocket] = user_nickname
                    online_users.add(user_nickname)
                    
                    logger.info(f"用户 {user_nickname} 已登录")
                    
                    # 发送登录成功消息给当前用户
                    await websocket.send(json.dumps({
                        'type': 'login_success',
                        'nickname': user_nickname,
                        'users': list(online_users)
                    }))
                    
                    # 广播用户加入消息给其他用户
                    broadcast_message = {
                        'type': 'user_joined',
                        'nickname': user_nickname,
                        'message': f"{user_nickname} 加入了聊天室",
                        'users': list(online_users),
                        'timestamp': datetime.now().isoformat()
                    }
                    await broadcast(broadcast_message, exclude=[websocket])
                    
                # 处理聊天消息
                elif (data.get('type') == 'message' or data.get('content')) and user_nickname:
                    content = data.get('content', '') or data.get('message', '')
                    content = content.strip()
                    
                    if not content:
                        continue
                    
                    # 构建消息对象
                    chat_message = {
                        'type': 'message',
                        'username': user_nickname,
                        'message': content,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # 检查是否包含@指令
                    if content.startswith('@'):
                        # 简单的@指令处理
                        parts = content.split(' ', 1)
                        if len(parts) >= 2:
                            command = parts[0].lower()
                            # 后续可以扩展具体的@电影和@小科比功能
                            if command in ['@电影', '@小科比']:
                                # 这里只是基础框架，实际功能需要进一步实现
                                logger.info(f"收到@指令: {command} 内容: {parts[1]}")
                                # 可以在这里添加AI回复逻辑
                    
                    # 广播消息给所有用户
                    await broadcast(chat_message)
                    
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': '无效的消息格式'
                }))
            except Exception as e:
                logger.error(f"处理消息时出错: {e}")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': '处理消息时出错'
                }))
    
    except websockets.exceptions.ConnectionClosedError:
        logger.info(f"连接意外关闭: {user_nickname}")
    except Exception as e:
        logger.error(f"客户端处理异常: {e}")
    finally:
        # 清理用户连接
        if websocket in connected_users:
            user_nickname = connected_users[websocket]
            del connected_users[websocket]
            online_users.discard(user_nickname)
            logger.info(f"用户 {user_nickname} 已退出")
            
            # 广播用户离开消息
            leave_message = {
                'type': 'user_left',
                'nickname': user_nickname,
                'message': f"{user_nickname} 离开了聊天室",
                'users': list(online_users),
                'timestamp': datetime.now().isoformat()
            }
            await broadcast(leave_message)

async def broadcast(message, exclude=None):
    """广播消息给所有连接的用户，可选排除某些连接"""
    if exclude is None:
        exclude = []
    
    # 将消息转换为JSON字符串
    message_str = json.dumps(message)
    
    # 复制连接列表以避免在迭代过程中修改
    connections = list(connected_users.keys())
    
    # 并发发送消息
    tasks = []
    for conn in connections:
        if conn not in exclude:
            tasks.append(send_message(conn, message_str))
    
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

async def send_message(websocket, message):
    """发送消息给单个WebSocket连接"""
    try:
        await websocket.send(message)
    except Exception as e:
        logger.error(f"发送消息失败: {e}")
        # 如果发送失败，清理连接
        if websocket in connected_users:
            user_nickname = connected_users[websocket]
            del connected_users[websocket]
            online_users.discard(user_nickname)
            logger.info(f"发送失败，移除用户 {user_nickname}")

async def main():
    """主函数，启动WebSocket服务器"""
    # 创建WebSocket服务器
    server = await websockets.serve(
        handle_client,
        "0.0.0.0",  # 监听所有网络接口
        8001,        # 端口
        ping_interval=30,  # 心跳间隔
        ping_timeout=60    # 心跳超时
    )
    
    logger.info("WebSocket服务器已启动，监听端口 8001")
    
    # 运行服务器直到被中断
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("WebSocket服务器已关闭")
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")