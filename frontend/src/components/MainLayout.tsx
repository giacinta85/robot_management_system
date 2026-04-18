import { Layout, Menu, Button, Avatar, Typography, Dropdown } from 'antd'
import {
  RobotOutlined, ToolOutlined, CalendarOutlined,
  FileTextOutlined, DashboardOutlined, UserOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览', roles: ['admin', 'rd_test', 'maintenance', 'marketing'] },
  { key: '/machines', icon: <RobotOutlined />, label: '机器管理', roles: ['admin', 'rd_test'] },
  { key: '/maintenance', icon: <ToolOutlined />, label: '维修记录', roles: ['admin', 'maintenance', 'rd_test'] },
  { key: '/requests', icon: <FileTextOutlined />, label: '市场申请', roles: ['admin'] },
  { key: '/calendar', icon: <CalendarOutlined />, label: '可用性看板', roles: ['admin'] },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, fullName, logout } = useAuthStore()

  const visibleItems = menuItems
    .filter((item) => !role || item.roles.includes(role))
    .map(({ key, icon, label }) => ({ key, icon, label }))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
          <Typography.Text style={{ color: '#fff', display: 'block', marginTop: 4, fontSize: 12 }}>
            机器管理系统
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <Dropdown
            menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{fullName || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '16px', overflow: 'initial' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
