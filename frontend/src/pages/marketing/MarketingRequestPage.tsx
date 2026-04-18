import { useState } from 'react'
import { Form, Input, InputNumber, DatePicker, Button, Card, message, Result, Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import type { RangePickerProps } from 'antd/es/date-picker'
import dayjs from 'dayjs'
import { marketingApi } from '../../api'

const { RangePicker } = DatePicker

export default function MarketingRequestPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const disabledDate: RangePickerProps['disabledDate'] = (current) =>
    current && current < dayjs().startOf('day')

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const [start, end] = values.date_range
      await marketingApi.submitRequest({
        requester_name: values.requester_name,
        requester_contact: values.requester_contact,
        event_name: values.event_name,
        location: values.location,
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
        quantity_needed: values.quantity_needed,
        notes: values.notes,
      })
      setSubmitted(true)
    } catch (e: any) {
      message.error(e.response?.data?.detail || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: 16 }}>
        <Result
          status="success"
          title="申请提交成功！"
          subTitle="我们已收到您的机器需求申请，管理员将尽快审核，审核结果将通过您留下的联系方式通知您。"
          extra={[
            <Button onClick={() => { setSubmitted(false); form.resetFields() }}>再次申请</Button>,
          ]}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <RobotOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Typography.Title level={4} style={{ marginTop: 8 }}>机器人需求申请</Typography.Title>
          <Typography.Text type="secondary">填写以下信息，提交机器使用需求</Typography.Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item label="申请人姓名" name="requester_name" rules={[{ required: true, message: '请填写姓名' }]}>
            <Input placeholder="您的姓名" size="large" />
          </Form.Item>

          <Form.Item label="联系方式" name="requester_contact">
            <Input placeholder="手机号或邮箱（选填）" size="large" />
          </Form.Item>

          <Form.Item label="活动/项目名称" name="event_name" rules={[{ required: true, message: '请填写活动名称' }]}>
            <Input placeholder="例：2026产品发布会" size="large" />
          </Form.Item>

          <Form.Item label="使用地点" name="location" rules={[{ required: true, message: '请填写地点' }]}>
            <Input placeholder="例：上海国家会展中心" size="large" />
          </Form.Item>

          <Form.Item label="使用日期" name="date_range" rules={[{ required: true, message: '请选择日期范围' }]}>
            <RangePicker style={{ width: '100%' }} size="large" disabledDate={disabledDate} />
          </Form.Item>

          <Form.Item
            label="需要机器数量"
            name="quantity_needed"
            rules={[{ required: true, message: '请填写数量' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} placeholder="其他说明（机器型号要求、特殊需求等）" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              提交申请
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
