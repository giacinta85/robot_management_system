import { useEffect, useState } from 'react'
import { Card, Typography, Row, Col, Statistic, Divider } from 'antd'
import { RobotOutlined, ToolOutlined, CalendarOutlined, FileTextOutlined,
  CheckCircleOutlined, SyncOutlined, WarningOutlined, StopOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/auth'
import { machinesApi } from '../api'

const roleLabel: Record<string, string> = {
  admin: '管理员',
  rd_test: '研发/测试',
  maintenance: '维修技术员',
  marketing: '市场人员',
}

export default function DashboardPage() {
  const { role, fullName } = useAuthStore()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    machinesApi.getStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      <Typography.Title level={4}>欢迎回来，{fullName} ({role ? roleLabel[role] : ''})</Typography.Title>

      {stats && (
        <>
          <Divider orientation="left">机器状态总览</Divider>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="机器总数" value={stats.total} prefix={<RobotOutlined />} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={5}>
              <Card>
                <Statistic title="空闲" value={stats.idle} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={5}>
              <Card>
                <Statistic title="使用中" value={stats.in_use} prefix={<SyncOutlined />} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={5}>
              <Card>
                <Statistic title="维修中" value={stats.under_repair} prefix={<WarningOutlined />} valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={5}>
              <Card>
                <Statistic title="已退役" value={stats.retired} prefix={<StopOutlined />} valueStyle={{ color: '#999' }} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Divider orientation="left">功能模块</Divider>
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
