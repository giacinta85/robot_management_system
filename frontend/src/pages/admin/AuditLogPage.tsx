import React, { useEffect, useState } from 'react'
import { Table, Tag, Button, Popconfirm, message, Space, Typography, Select, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { auditApi } from '../../api'

const { Text } = Typography
const { Option } = Select

interface AuditLog {
  id: string
  username: string | null
  table_name: string
  record_id: string
  operation: string
  description: string | null
  before_data: string | null
  after_data: string | null
  reverted: boolean
  created_at: string
}

const OP_COLOR: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
}

const OP_LABEL: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filtered, setFiltered] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [reverting, setReverting] = useState<string | null>(null)
  const [opFilter, setOpFilter] = useState<string>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await auditApi.listLogs()
      setLogs(res.data)
    } catch {
      message.error('加载日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let data = logs
    if (opFilter !== 'all') data = data.filter(l => l.operation === opFilter)
    if (tableFilter !== 'all') data = data.filter(l => l.table_name === tableFilter)
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(l =>
        l.description?.toLowerCase().includes(s) ||
        l.username?.toLowerCase().includes(s) ||
        l.record_id.toLowerCase().includes(s)
      )
    }
    setFiltered(data)
  }, [logs, opFilter, tableFilter, search])

  const handleRevert = async (id: string) => {
    setReverting(id)
    try {
      const res = await auditApi.revertLog(id)
      message.success(res.data.message || '回退成功')
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '回退失败')
    } finally {
      setReverting(null)
    }
  }

  const tableNames = Array.from(new Set(logs.map(l => l.table_name)))

  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
      sorter: (a, b) => a.created_at.localeCompare(b.created_at),
      defaultSortOrder: 'descend',
    },
    {
      title: '操作者',
      dataIndex: 'username',
      width: 120,
      render: v => v ?? '—',
    },
    {
      title: '操作类型',
      dataIndex: 'operation',
      width: 90,
      render: (v: string) => (
        <Tag color={OP_COLOR[v] ?? 'default'}>{OP_LABEL[v] ?? v}</Tag>
      ),
    },
    {
      title: '数据表',
      dataIndex: 'table_name',
      width: 160,
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: v => v ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'reverted',
      width: 80,
      render: v => v ? <Tag color="warning">已回退</Tag> : <Tag color="success">有效</Tag>,
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        record.reverted ? (
          <Text type="secondary" style={{ fontSize: 12 }}>已回退</Text>
        ) : (
          <Popconfirm
            title={`确认回退此操作？`}
            description={`${OP_LABEL[record.operation] ?? record.operation}将被撤销，操作不可反复。`}
            onConfirm={() => handleRevert(record.id)}
            okText="确认回退"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              loading={reverting === record.id}
            >
              回退
            </Button>
          </Popconfirm>
        )
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>操作日志</span>
        <Select value={opFilter} onChange={setOpFilter} style={{ width: 120 }}>
          <Option value="all">全部类型</Option>
          <Option value="create">新增</Option>
          <Option value="update">修改</Option>
          <Option value="delete">删除</Option>
        </Select>
        <Select value={tableFilter} onChange={setTableFilter} style={{ width: 180 }}>
          <Option value="all">全部数据表</Option>
          {tableNames.map(t => <Option key={t} value={t}>{t}</Option>)}
        </Select>
        <Input.Search
          placeholder="搜索说明/用户/ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Button onClick={load} loading={loading}>刷新</Button>
        <Text type="secondary" style={{ marginLeft: 'auto' }}>共 {filtered.length} 条</Text>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        size="small"
        expandable={{
          expandedRowRender: record => (
            <div style={{ display: 'flex', gap: 24, padding: '8px 0' }}>
              {record.before_data && (
                <div style={{ flex: 1 }}>
                  <Text type="secondary">操作前</Text>
                  <pre style={{
                    background: '#fff1f0',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 200,
                    overflow: 'auto',
                    marginTop: 4,
                  }}>
                    {JSON.stringify(JSON.parse(record.before_data), null, 2)}
                  </pre>
                </div>
              )}
              {record.after_data && (
                <div style={{ flex: 1 }}>
                  <Text type="secondary">操作后</Text>
                  <pre style={{
                    background: '#f6ffed',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    maxHeight: 200,
                    overflow: 'auto',
                    marginTop: 4,
                  }}>
                    {JSON.stringify(JSON.parse(record.after_data), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ),
          rowExpandable: record => !!(record.before_data || record.after_data),
        }}
        pagination={{ pageSize: 50, showSizeChanger: true }}
      />
    </div>
  )
}
