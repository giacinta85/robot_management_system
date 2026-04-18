import { useState } from 'react'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { RobotOutlined } from '@ant-design/icons'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authApi.login(values.username, values.password)
      setAuth(res.data.access_token, res.data.role, res.data.user_id, res.data.full_name)
      navigate('/')
    } catch {
      message.error('用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <RobotOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ marginTop: 8 }}>机器人管理系统</Typography.Title>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          市场人员提交需求：<a href="/request" target="_blank">/request</a>
        </Typography.Text>
      </Card>
    </div>
  )
}
