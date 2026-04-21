import { useEffect, useState } from 'react'
import { Form, Input, Button, Card, message, Result, Typography, Radio, Select } from 'antd'
import { CustomerServiceOutlined } from '@ant-design/icons'
import { afterSalesApi, adminResourcesApi } from '../../api'

export default function AfterSalesRequestPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [models, setModels] = useState<any[]>([])

  useEffect(() => {
    adminResourcesApi.listMachineModels().then(r => setModels(r.data))
  }, [])

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      await afterSalesApi.submitRequest({
        requester_name: values.requester_name,
        requester_contact: values.requester_contact,
        machine_serial: values.machine_serial,
        machine_model: values.machine_model,
        issue_type: values.issue_type,
        issue_description: values.issue_description,
        urgency: values.urgency,
        notes: values.notes,
      })
      setSubmitted(true)
    } catch (e: any) {
      message.error(e.response?.data?.detail || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: 16 }}>
        <Result
          status="success"
          title="售后申请已提交！"
          subTitle="我们已收到您的售后申请，将尽快为您处理。"
          extra={<Button onClick={() => { setSubmitted(false); form.resetFields() }}>再次提交</Button>}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CustomerServiceOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Typography.Title level={4} style={{ marginTop: 8 }}>售后申请</Typography.Title>
          <Typography.Text type="secondary">填写以下信息，提交售后服务申请</Typography.Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item label="申请人姓名" name="requester_name" rules={[{ required: true }]}>
            <Input placeholder="您的姓名" />
          </Form.Item>
          <Form.Item label="联系方式" name="requester_contact">
            <Input placeholder="手机号或邮箱" />
          </Form.Item>
          <Form.Item label="机器序列号" name="machine_serial">
            <Input placeholder="机器序列号（选填）" />
          </Form.Item>
          <Form.Item label="机器型号" name="machine_model">
            <Select allowClear placeholder="选择型号（选填）" options={models.map(m => ({ value: m.name, label: m.name }))} />
          </Form.Item>

          <Form.Item label="问题类型" name="issue_type" rules={[{ required: true, message: '请选择问题类型' }]}>
            <Radio.Group>
              <Radio value="hardware">硬件故障</Radio>
              <Radio value="software">软件问题</Radio>
              <Radio value="other">其他</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="问题描述" name="issue_description" rules={[{ required: true, message: '请描述问题' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述问题现象和复现步骤" />
          </Form.Item>

          <Form.Item label="紧急程度" name="urgency" rules={[{ required: true, message: '请选择紧急程度' }]}>
            <Radio.Group>
              <Radio value="urgent">紧急</Radio>
              <Radio value="normal">正常</Radio>
              <Radio value="low">不急</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="其他备注" name="notes">
            <Input.TextArea rows={2} placeholder="其他补充说明" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>提交售后申请</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
