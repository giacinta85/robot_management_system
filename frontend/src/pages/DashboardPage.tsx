import { Card, Typography, Row, Col } from 'antd'
import { RobotOutlined, ToolOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/auth'

const roleLabel: Record<string, string> = {
  admin: '管理员',
  rd_test: '研发/测试',
  maintenance: '维修技术员',
  marketing: '市场人员',
}

export default function DashboardPage() {
  const { role, fullName } = useAuthStore()
  return (
    <div>
      <Typography.Title level={4}>欢迎回来，{fullName} ({role ? roleLabel[role] : ''})</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <RobotOutlined style={{ fontSize: 32, color: '#1677ff' }} />
            <Typography.Title level={5} style={{ marginTop: 8 }}>机器管理</Typography.Title>
            <Typography.Text type="secondary">跟踪所有机器状态与分配</Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <ToolOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
            <Typography.Title level={5} style={{ marginTop: 8 }}>维修记录</Typography.Title>
            <Typography.Text type="secondary">记录每次维修详情</Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />
            <Typography.Title level={5} style={{ marginTop: 8 }}>市场申请</Typography.Title>
            <Typography.Text type="secondary">管理市场需求申请单</Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <CalendarOutlined style={{ fontSize: 32, color: '#722ed1' }} />
            <Typography.Title level={5} style={{ marginTop: 8 }}>可用性看板</Typography.Title>
            <Typography.Text type="secondary">甘特图查看机器空闲状态</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
