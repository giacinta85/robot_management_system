import { useEffect, useState } from 'react'
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, message, Switch, Card, Row, Col, Typography, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons'
import { adminResourcesApi, authApi } from '../../api'
import { useAuthStore } from '../../store/auth'

// ── Generic CRUD Table Component ──────────────────────

function ResourceTable({
  data, loading, columns, onAdd, onEdit, onDelete,
}: {
  data: any[]; loading: boolean; columns: any[]; onAdd: () => void; onEdit: (r: any) => void; onDelete: (id: string) => void
}) {
  const cols = [
    ...columns,
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]
  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 12 }}>新增</Button>
      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small" />
    </>
  )
}

// ── Machine Models Tab ────────────────────────

function MachineModelsTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listMachineModels()
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openForm = (row?: any) => { setEditing(row ?? null); form.setFieldsValue(row ?? { name: '', description: '' }); setOpen(true) }
  const onSave = async (values: any) => {
    editing ? await adminResourcesApi.updateMachineModel(editing.id, values) : await adminResourcesApi.createMachineModel(values)
    message.success('已保存'); setOpen(false); load()
  }
  const onDelete = async (id: string) => { await adminResourcesApi.deleteMachineModel(id); message.success('已删除'); load() }

  return (
    <>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[
          { title: '型号名称', dataIndex: 'name', width: 120 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
        ]}
      />
      <Modal title={editing ? '编辑型号' : '新增型号'} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="型号名称" name="name" rules={[{ required: true }]}><Input placeholder="例：NIX2" /></Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Dance Policies Tab ────────────────────────

function DancePoliciesTab({ models }: { models: string[] }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterModel, setFilterModel] = useState<string>()
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listDancePolicies(filterModel)
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filterModel])

  const openForm = (row?: any) => { setEditing(row ?? null); form.setFieldsValue(row ?? {}); setOpen(true) }
  const onSave = async (values: any) => {
    editing ? await adminResourcesApi.updateDancePolicy(editing.id, values) : await adminResourcesApi.createDancePolicy(values)
    message.success('已保存'); setOpen(false); load()
  }
  const onDelete = async (id: string) => { await adminResourcesApi.deleteDancePolicy(id); message.success('已删除'); load() }

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Select allowClear placeholder="按型号筛选" style={{ width: 160 }} value={filterModel}
          onChange={setFilterModel} options={models.map(m => ({ value: m, label: m }))} />
      </Space>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[
          { title: '舞蹈名称', dataIndex: 'name' },
          { title: '适用型号', dataIndex: 'machine_model', render: (v: string) => v || '-' },
          { title: '时长(秒)', dataIndex: 'duration_seconds', render: (v: number) => v ?? '-' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
        ]}
      />
      <Modal title={editing ? '编辑舞蹈' : '新增舞蹈'} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="舞蹈名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="适用型号" name="machine_model">
            <Select allowClear placeholder="选择型号" options={models.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item label="时长（秒）" name="duration_seconds"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Motion Actions Tab ────────────────────────

function MotionActionsTab({ models }: { models: string[] }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterModel, setFilterModel] = useState<string>()
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listMotionActions(filterModel)
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filterModel])

  const openForm = (row?: any) => { setEditing(row ?? null); form.setFieldsValue(row ?? {}); setOpen(true) }
  const onSave = async (values: any) => {
    editing ? await adminResourcesApi.updateMotionAction(editing.id, values) : await adminResourcesApi.createMotionAction(values)
    message.success('已保存'); setOpen(false); load()
  }
  const onDelete = async (id: string) => { await adminResourcesApi.deleteMotionAction(id); message.success('已删除'); load() }

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Select allowClear placeholder="按型号筛选" style={{ width: 160 }} value={filterModel}
          onChange={setFilterModel} options={models.map(m => ({ value: m, label: m }))} />
      </Space>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[
          { title: '动作名称', dataIndex: 'name' },
          { title: '适用型号', dataIndex: 'machine_model', render: (v: string) => v || '-' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
        ]}
      />
      <Modal title={editing ? '编辑动作' : '新增动作'} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="动作名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="适用型号" name="machine_model">
            <Select allowClear placeholder="选择型号" options={models.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Voice Packages Tab ────────────────────────

function VoicePackagesTab({ models }: { models: string[] }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterModel, setFilterModel] = useState<string>()
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listVoicePackages(filterModel)
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filterModel])

  const openForm = (row?: any) => { setEditing(row ?? null); form.setFieldsValue(row ?? {}); setOpen(true) }
  const onSave = async (values: any) => {
    editing ? await adminResourcesApi.updateVoicePackage(editing.id, values) : await adminResourcesApi.createVoicePackage(values)
    message.success('已保存'); setOpen(false); load()
  }
  const onDelete = async (id: string) => { await adminResourcesApi.deleteVoicePackage(id); message.success('已删除'); load() }

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Select allowClear placeholder="按型号筛选" style={{ width: 160 }} value={filterModel}
          onChange={setFilterModel} options={models.map(m => ({ value: m, label: m }))} />
      </Space>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[
          { title: '语音包名称', dataIndex: 'name' },
          { title: '适用型号', dataIndex: 'machine_model', render: (v: string) => v || '-' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
        ]}
      />
      <Modal title={editing ? '编辑语音包' : '新增语音包'} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="语音包名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="适用型号" name="machine_model">
            <Select allowClear placeholder="选择型号" options={models.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item label="描述" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Feature Flags Tab ─────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  remote_operation: '遥操作',
  dance: '舞蹈',
  voice: '语音',
  motion: '动作',
  group_control: '群控',
}

function FeatureFlagsTab() {
  const [features, setFeatures] = useState<Record<string, boolean>>({
    remote_operation: true, dance: true, voice: true, motion: true, group_control: true,
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const r = await adminResourcesApi.getFeatures()
      setFeatures(r.data)
    } catch {
      message.error('加载失败')
    }
  }
  useEffect(() => { load() }, [])

  const toggle = async (key: string, val: boolean) => {
    const next = { ...features, [key]: val }
    setFeatures(next)
    setSaving(true)
    try {
      await adminResourcesApi.updateFeatures(next)
      message.success(`${FEATURE_LABELS[key]} 已${val ? '开启' : '关闭'}`)
    } catch {
      message.error('保存失败')
      setFeatures(features) // revert
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        关闭后，该功能将不再出现在公开申请表单和审批界面中。
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {Object.entries(FEATURE_LABELS).map(([key, label]) => (
          <Col key={key} xs={24} sm={12} md={8}>
            <Card size="small" style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text strong style={{ fontSize: 15 }}>{label}</Typography.Text>
                <Switch
                  checked={features[key]}
                  onChange={val => toggle(key, val)}
                  loading={saving}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

// ── Departments Tab ───────────────────────────

function DepartmentsTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listDepartments()
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const onSave = async (values: any) => {
    try {
      await adminResourcesApi.createDepartment(values)
      message.success('已添加')
      setOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '添加失败（部门名可能重复）')
    }
  }
  const onDelete = async (id: string) => {
    await adminResourcesApi.deleteDepartment(id)
    message.success('已删除')
    load()
  }

  return (
    <>
      <ResourceTable
        data={data} loading={loading} onAdd={() => setOpen(true)} onEdit={() => {}} onDelete={onDelete}
        columns={[{ title: '部门名称', dataIndex: 'name', width: 200 }]}
      />
      <Modal title="新增部门" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例：研发部" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>添加</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}


// ── Users Tab ─────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  rd_test: '研发/测试',
  maintenance: '维修工程师',
}
const ROLE_COLOR: Record<string, string> = {
  admin: 'red',
  rd_test: 'blue',
  maintenance: 'orange',
}

function UsersTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [pwdTarget, setPwdTarget] = useState<any>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [pwdForm] = Form.useForm()
  const currentUserId = useAuthStore(s => s.userId)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authApi.listUsers()
      setData(r.data)
    } catch {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const onCreate = async (values: any) => {
    try {
      await authApi.createUser(values)
      message.success('账号已创建')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建失败')
    }
  }

  const openEdit = (row: any) => {
    setEditTarget(row)
    editForm.setFieldsValue({ role: row.role, full_name: row.full_name })
  }

  const onEditSave = async (values: any) => {
    try {
      await authApi.updateUser(editTarget.id, values)
      message.success('已更新')
      setEditTarget(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败')
    }
  }

  const onResetPwd = async (values: any) => {
    try {
      await authApi.updateUser(pwdTarget.id, { password: values.password })
      message.success('密码已重置')
      setPwdTarget(null)
      pwdForm.resetFields()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '重置失败')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await authApi.deleteUser(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  const roleOptions = [
    { value: 'admin', label: '管理员' },
    { value: 'rd_test', label: '研发/测试' },
    { value: 'maintenance', label: '维修工程师' },
  ]

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 140 },
    { title: '姓名', dataIndex: 'full_name', render: (v: string) => v || '-' },
    {
      title: '角色', dataIndex: 'role', width: 130,
      render: (r: string) => <Tag color={ROLE_COLOR[r] || 'default'}>{ROLE_LABELS[r] || r}</Tag>,
    },
    { title: '状态', dataIndex: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '正常' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', width: 180, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    {
      title: '操作', width: 180,
      render: (_: any, row: any) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑角色</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => { setPwdTarget(row); pwdForm.resetFields() }}>重置密码</Button>
          {row.id !== currentUserId && (
            <Popconfirm title={`确认删除账号「${row.username}」？此操作不可撤销。`} onConfirm={() => onDelete(row.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ marginBottom: 12 }}>新增账号</Button>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />

      {/* Create Modal */}
      <Modal title="新增账号" open={createOpen} onCancel={() => { setCreateOpen(false); createForm.resetFields() }} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={onCreate}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="英文、数字，唯一" />
          </Form.Item>
          <Form.Item label="姓名（可选）" name="full_name">
            <Input placeholder="显示名称" />
          </Form.Item>
          <Form.Item label="角色" name="role" initialValue="rd_test" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, min: 6, message: '至少6位' }]}>
            <Input.Password placeholder="至少6位" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal title={`编辑账号：${editTarget?.username}`} open={!!editTarget} onCancel={() => setEditTarget(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={onEditSave}>
          <Form.Item label="姓名" name="full_name">
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal title={`重置密码：${pwdTarget?.username}`} open={!!pwdTarget} onCancel={() => { setPwdTarget(null); pwdForm.resetFields() }} footer={null}>
        <Form form={pwdForm} layout="vertical" onFinish={onResetPwd}>
          <Form.Item label="新密码" name="password" rules={[{ required: true, min: 6, message: '至少6位' }]}>
            <Input.Password placeholder="至少6位" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认重置</Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}


// ── Main Page ─────────────────────────────────

export default function AdminResourcesPage() {
  const [models, setModels] = useState<string[]>([])

  useEffect(() => {
    adminResourcesApi.listMachineModels().then(r => setModels(r.data.map((m: any) => m.name)))
  }, [])

  return (
    <div>
      <h2>资源库管理</h2>
      <Tabs
        items={[
          { key: 'users', label: '账号管理', children: <UsersTab /> },
          { key: 'features', label: '功能开关', children: <FeatureFlagsTab /> },
          { key: 'models', label: '机器型号', children: <MachineModelsTab /> },
          { key: 'departments', label: '部门管理', children: <DepartmentsTab /> },
          { key: 'dance', label: '舞蹈库', children: <DancePoliciesTab models={models} /> },
          { key: 'motion', label: '动作库', children: <MotionActionsTab models={models} /> },
          { key: 'voice', label: '语音包', children: <VoicePackagesTab models={models} /> },
        ]}
      />
    </div>
  )
}
