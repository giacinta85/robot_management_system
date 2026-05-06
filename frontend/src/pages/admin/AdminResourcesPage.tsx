import { useEffect, useState } from 'react'
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, message, Switch, Card, Row, Col, Typography, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons'
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

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

  const onCreate = async (values: any) => {
    try {
      await adminResourcesApi.createDepartment(values)
      message.success('已添加')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '添加失败（部门名可能重复）')
    }
  }

  const openEdit = (row: any) => {
    setEditing(row)
    editForm.setFieldsValue({ name: row.name })
  }

  const onEdit = async (values: any) => {
    try {
      await adminResourcesApi.updateDepartment(editing.id, values)
      message.success('已更新')
      setEditing(null)
      editForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败（部门名可能重复）')
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
        data={data} loading={loading} onAdd={() => setCreateOpen(true)} onEdit={openEdit} onDelete={onDelete}
        columns={[{ title: '部门名称', dataIndex: 'name', width: 200 }]}
      />
      <Modal title="新增部门" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={onCreate}>
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例：研发部" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>添加</Button></Form.Item>
        </Form>
      </Modal>
      <Modal title="编辑部门" open={!!editing} onCancel={() => { setEditing(null); editForm.resetFields() }} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例：研发部" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
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


// ── Damage Cause Presets Tab ──────────────────

function DamageCausePresetsTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listDamageCausePresets()
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openForm = (row?: any) => {
    setEditing(row ?? null)
    form.setFieldsValue(row ?? { name: '' })
    setOpen(true)
  }
  const onSave = async (values: any) => {
    editing
      ? await adminResourcesApi.updateDamageCausePreset(editing.id, values)
      : await adminResourcesApi.createDamageCausePreset(values)
    message.success('已保存')
    setOpen(false)
    form.resetFields()
    load()
  }
  const onDelete = async (id: string) => {
    await adminResourcesApi.deleteDamageCausePreset(id)
    message.success('已删除')
    load()
  }

  return (
    <>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        维修记录表单中「损坏原因」字段的快速选项。维修员可从此列表选择，也可手动输入。
      </Typography.Paragraph>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[{ title: '损坏原因', dataIndex: 'name', width: 300 }]}
      />
      <Modal title={editing ? '编辑损坏原因' : '新增损坏原因'} open={open} onCancel={() => { setOpen(false); form.resetFields() }} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="损坏原因名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例：电机损坏、线路短路" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>
    </>
  )
}


// ── Generic Version Resource Tab (电机固件/电源板/镜像) ────────────────

function VersionResourceTab({ models, label, apiList, apiCreate, apiUpdate, apiDelete }: {
  models: string[]
  label: string
  apiList: (model?: string) => Promise<any>
  apiCreate: (data: any) => Promise<any>
  apiUpdate: (id: string, data: any) => Promise<any>
  apiDelete: (id: string) => Promise<any>
}) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterModel, setFilterModel] = useState<string>()
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await apiList(filterModel)
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filterModel])

  const openForm = (row?: any) => {
    setEditing(row ?? null)
    form.setFieldsValue(row ?? { name: '', machine_model: undefined, description: '' })
    setOpen(true)
  }
  const onSave = async (values: any) => {
    editing ? await apiUpdate(editing.id, values) : await apiCreate(values)
    message.success('已保存'); setOpen(false); form.resetFields(); load()
  }
  const onDelete = async (id: string) => { await apiDelete(id); message.success('已删除'); load() }

  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Select allowClear placeholder="按型号筛选" style={{ width: 160 }} value={filterModel}
          onChange={setFilterModel} options={models.map(m => ({ value: m, label: m }))} />
      </Space>
      <ResourceTable
        data={data} loading={loading} onAdd={() => openForm()} onEdit={openForm} onDelete={onDelete}
        columns={[
          { title: '版本名称', dataIndex: 'name' },
          { title: '适用型号', dataIndex: 'machine_model', render: (v: string) => v || '-' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
        ]}
      />
      <Modal title={editing ? `编辑${label}` : `新增${label}`} open={open} onCancel={() => { setOpen(false); form.resetFields() }} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item label="版本名称" name="name" rules={[{ required: true }]}><Input placeholder="例：v1.2.3" /></Form.Item>
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


// ── Attribute Definitions Tab ─────────────────

const FIELD_TYPE_LABEL: Record<string, string> = { text: '文本', select: '下拉选择' }

function AttributeManagementTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await adminResourcesApi.listAttributeDefinitions()
      setData(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const onCreate = async (values: any) => {
    try {
      const presets = values.preset_values ?? []
      await adminResourcesApi.createAttributeDefinition({
        field_key: values.field_key,
        display_name: values.display_name,
        field_type: values.field_type ?? 'text',
        preset_values: presets,
        display_order: values.display_order ?? 0,
      })
      message.success('属性已创建')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建失败（字段键可能重复）')
    }
  }

  const openEdit = (row: any) => {
    setEditTarget(row)
    editForm.setFieldsValue({
      display_name: row.display_name,
      field_type: row.field_type,
      preset_values: row.preset_values ?? [],
      display_order: row.display_order,
    })
  }

  const onEditSave = async (values: any) => {
    try {
      await adminResourcesApi.updateAttributeDefinition(editTarget.id, {
        display_name: values.display_name,
        field_type: values.field_type,
        preset_values: values.preset_values ?? [],
        display_order: values.display_order,
      })
      message.success('已更新')
      setEditTarget(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await adminResourcesApi.deleteAttributeDefinition(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  const columns = [
    { title: '字段键', dataIndex: 'field_key', width: 160, render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: '显示名称', dataIndex: 'display_name', width: 140 },
    { title: '类型', dataIndex: 'field_type', width: 100, render: (v: string) => FIELD_TYPE_LABEL[v] || v },
    {
      title: '预设值', dataIndex: 'preset_values',
      render: (v: string[]) => v?.length ? (
        <Space wrap size={4}>{v.map(p => <Tag key={p} style={{ margin: 0 }}>{p}</Tag>)}</Space>
      ) : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '排序', dataIndex: 'display_order', width: 60,
    },
    {
      title: '操作', width: 140,
      render: (_: any, row: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
          {row.is_system ? (
            <Tag icon={<LockOutlined />} color="default" style={{ margin: 0 }}>内置</Tag>
          ) : (
            <Popconfirm title={`确认删除属性「${row.display_name}」？`} onConfirm={() => onDelete(row.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        管理机器详情页中的属性字段。系统内置字段不可删除，但可修改显示名称和预设值。自定义字段的值存储在各机器的属性记录中。
      </Typography.Paragraph>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ marginBottom: 12 }}>新增属性</Button>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" />

      {/* Create */}
      <Modal title="新增属性字段" open={createOpen} onCancel={() => { setCreateOpen(false); createForm.resetFields() }} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={onCreate}>
          <Form.Item label="字段键（唯一标识）" name="field_key" rules={[{ required: true, message: '请输入字段键' }, { pattern: /^[a-z_][a-z0-9_]*$/, message: '只允许小写字母、数字和下划线' }]}>
            <Input placeholder="例：voltage_spec" />
          </Form.Item>
          <Form.Item label="显示名称" name="display_name" rules={[{ required: true }]}>
            <Input placeholder="例：电压规格" />
          </Form.Item>
          <Form.Item label="字段类型" name="field_type" initialValue="text">
            <Select options={[{ value: 'text', label: '文本' }, { value: 'select', label: '下拉选择' }]} />
          </Form.Item>
          <Form.Item label="预设值（下拉选项，可多个）" name="preset_values">
            <Select mode="tags" placeholder="输入后按回车添加预设值" open={false} tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item label="排序权重" name="display_order" initialValue={10}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>创建</Button></Form.Item>
        </Form>
      </Modal>

      {/* Edit */}
      <Modal title={`编辑属性：${editTarget?.display_name}`} open={!!editTarget} onCancel={() => setEditTarget(null)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={onEditSave}>
          <Form.Item label="显示名称" name="display_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="字段类型" name="field_type">
            <Select options={[{ value: 'text', label: '文本' }, { value: 'select', label: '下拉选择' }]} />
          </Form.Item>
          <Form.Item label="预设值（下拉选项）" name="preset_values">
            <Select mode="tags" placeholder="输入后按回车添加" open={false} tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item label="排序权重" name="display_order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
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
          { key: 'models', label: '机器型号', children: <MachineModelsTab /> },
          { key: 'departments', label: '部门管理', children: <DepartmentsTab /> },
          { key: 'damage_causes', label: '损坏原因预设', children: <DamageCausePresetsTab /> },
          { key: 'motor_firmware', label: '电机固件版本', children: <VersionResourceTab models={models} label="电机固件版本" apiList={adminResourcesApi.listMotorFirmwareVersions} apiCreate={adminResourcesApi.createMotorFirmwareVersion} apiUpdate={adminResourcesApi.updateMotorFirmwareVersion} apiDelete={adminResourcesApi.deleteMotorFirmwareVersion} /> },
          { key: 'power_board', label: '电源板版本', children: <VersionResourceTab models={models} label="电源板版本" apiList={adminResourcesApi.listPowerBoardVersions} apiCreate={adminResourcesApi.createPowerBoardVersion} apiUpdate={adminResourcesApi.updatePowerBoardVersion} apiDelete={adminResourcesApi.deletePowerBoardVersion} /> },
          { key: 'system_image', label: '系统镜像版本', children: <VersionResourceTab models={models} label="系统镜像版本" apiList={adminResourcesApi.listSystemImageVersions} apiCreate={adminResourcesApi.createSystemImageVersion} apiUpdate={adminResourcesApi.updateSystemImageVersion} apiDelete={adminResourcesApi.deleteSystemImageVersion} /> },
          { key: 'features', label: '功能选项', children: <FeatureFlagsTab /> },
          { key: 'dance', label: '舞蹈库', children: <DancePoliciesTab models={models} /> },
          { key: 'motion', label: '动作库', children: <MotionActionsTab models={models} /> },
          { key: 'voice', label: '语音包', children: <VoicePackagesTab models={models} /> },
          { key: 'attributes', label: '属性管理', children: <AttributeManagementTab /> },
        ]}
      />
    </div>
  )
}
