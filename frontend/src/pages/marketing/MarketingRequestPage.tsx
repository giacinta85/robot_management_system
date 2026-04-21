import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, DatePicker, Button, Card, message, Result, Typography, Switch, Radio, Select, Divider } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import type { RangePickerProps } from 'antd/es/date-picker'
import dayjs from 'dayjs'
import { marketingApi, adminResourcesApi } from '../../api'

const { RangePicker } = DatePicker

export default function MarketingRequestPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [features, setFeatures] = useState<Record<string, boolean>>({
    remote_operation: true, dance: true, voice: true, motion: true, group_control: true,
  })
  const [machineModels, setMachineModels] = useState<string[]>([])
  const [dancePolicies, setDancePolicies] = useState<any[]>([])
  const [motionActions, setMotionActions] = useState<any[]>([])
  const [voicePackages, setVoicePackages] = useState<any[]>([])
  const [filterModel, setFilterModel] = useState<string | undefined>()

  const qty = Form.useWatch('quantity_needed', form) || 1
  const danceNeeded = Form.useWatch('dance_needed', form)
  const danceSource = Form.useWatch('dance_source', form)
  const voiceNeeded = Form.useWatch('voice_needed', form)
  const voiceSource = Form.useWatch('voice_source', form)
  const motionNeeded = Form.useWatch('motion_needed', form)
  const motionSource = Form.useWatch('motion_source', form)

  useEffect(() => {
    adminResourcesApi.getFeatures().then(r => setFeatures(r.data))
    adminResourcesApi.listMachineModels().then(r => setMachineModels(r.data.map((m: any) => m.name)))
    adminResourcesApi.listDancePolicies().then(r => setDancePolicies(r.data))
    adminResourcesApi.listMotionActions().then(r => setMotionActions(r.data))
    adminResourcesApi.listVoicePackages().then(r => setVoicePackages(r.data))
  }, [])

  const filteredDance = filterModel ? dancePolicies.filter(d => !d.machine_model || d.machine_model === filterModel) : dancePolicies
  const filteredVoice = filterModel ? voicePackages.filter(v => !v.machine_model || v.machine_model === filterModel) : voicePackages
  const filteredMotion = filterModel ? motionActions.filter(m => !m.machine_model || m.machine_model === filterModel) : motionActions

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
        machine_model: values.machine_model || null,
        remote_operation_needed: features.remote_operation ? (values.remote_operation_needed ?? false) : false,
        dance_needed: features.dance ? (values.dance_needed ?? false) : false,
        dance_source: features.dance && values.dance_needed ? values.dance_source : null,
        dance_policy_ids: features.dance && values.dance_needed && values.dance_source === 'existing' ? (values.dance_policy_ids || []) : [],
        group_control_needed: features.group_control && qty > 1 ? (values.group_control_needed ?? false) : false,
        voice_needed: features.voice ? (values.voice_needed ?? false) : false,
        voice_source: features.voice && values.voice_needed ? values.voice_source : null,
        voice_package_ids: features.voice && values.voice_needed && values.voice_source === 'existing' ? (values.voice_package_ids || []) : [],
        motion_needed: features.motion ? (values.motion_needed ?? false) : false,
        motion_source: features.motion && values.motion_needed ? values.motion_source : null,
        motion_action_ids: features.motion && values.motion_needed && values.motion_source === 'existing' ? (values.motion_action_ids || []) : [],
        custom_requirements: values.custom_requirements,
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

  const hasTechFeatures = features.remote_operation || features.dance || features.voice || features.motion || (features.group_control && qty > 1)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 620 }}>
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

          {machineModels.length > 0 && (
            <Form.Item
              label="需要机器型号"
              name="machine_model"
              rules={[{ required: true, message: '请选择机器型号' }]}
              extra="管理员将按此型号分配机器；选择后舞蹈/语音/动作选项自动过滤"
            >
              <Select
                placeholder="选择机器型号"
                size="large"
                onChange={(v) => setFilterModel(v)}
                options={machineModels.map(m => ({ value: m, label: m }))}
              />
            </Form.Item>
          )}

          <Form.Item label="需要机器数量" name="quantity_needed" rules={[{ required: true, message: '请填写数量' }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} size="large" />
          </Form.Item>

          {hasTechFeatures && (
            <>
              <Divider orientation="left" style={{ fontSize: 14 }}>技术需求</Divider>

              {(features.dance || features.voice || features.motion) && machineModels.length > 0 && (
                <Form.Item
                  label="机器型号确认"
                  style={{ display: 'none' }}
                  name="_model_hint"
                />
              )}

              {features.remote_operation && (
                <Form.Item label="是否需要遥操" name="remote_operation_needed" valuePropName="checked" initialValue={false}>
                  <Switch checkedChildren="需要" unCheckedChildren="不需要" />
                </Form.Item>
              )}

              {features.group_control && qty > 1 && (
                <Form.Item label="是否需要群控（多台协同）" name="group_control_needed" valuePropName="checked" initialValue={false}>
                  <Switch checkedChildren="需要" unCheckedChildren="不需要" />
                </Form.Item>
              )}

              {features.dance && (
                <>
                  <Form.Item label="是否需要舞蹈" name="dance_needed" valuePropName="checked" initialValue={false}>
                    <Switch checkedChildren="需要" unCheckedChildren="不需要" />
                  </Form.Item>
                  {danceNeeded && (
                    <>
                      <Form.Item label="舞蹈来源" name="dance_source" rules={[{ required: true, message: '请选择' }]}>
                        <Radio.Group>
                          <Radio value="existing">使用已有舞蹈</Radio>
                          <Radio value="custom">需要定制</Radio>
                        </Radio.Group>
                      </Form.Item>
                      {danceSource === 'existing' && (
                        <Form.Item label="选择舞蹈（可多选）" name="dance_policy_ids" rules={[{ required: true, message: '请选择舞蹈' }]}>
                          <Select mode="multiple" placeholder="选择已有舞蹈" options={filteredDance.map(d => ({
                            value: d.id, label: d.name + (d.machine_model ? ' (' + d.machine_model + ')' : ''),
                          }))} />
                        </Form.Item>
                      )}
                    </>
                  )}
                </>
              )}

              {features.voice && (
                <>
                  <Form.Item label="是否有语音需求" name="voice_needed" valuePropName="checked" initialValue={false}>
                    <Switch checkedChildren="有" unCheckedChildren="无" />
                  </Form.Item>
                  {voiceNeeded && (
                    <>
                      <Form.Item label="语音来源" name="voice_source" rules={[{ required: true, message: '请选择' }]}>
                        <Radio.Group>
                          <Radio value="existing">使用已有语音包</Radio>
                          <Radio value="custom">需要定制</Radio>
                        </Radio.Group>
                      </Form.Item>
                      {voiceSource === 'existing' && (
                        <Form.Item label="选择语音包（可多选）" name="voice_package_ids" rules={[{ required: true, message: '请选择' }]}>
                          <Select mode="multiple" placeholder="选择已有语音包" options={filteredVoice.map(v => ({
                            value: v.id, label: v.name + (v.machine_model ? ' (' + v.machine_model + ')' : ''),
                          }))} />
                        </Form.Item>
                      )}
                    </>
                  )}
                </>
              )}

              {features.motion && (
                <>
                  <Form.Item label="是否有动作需求" name="motion_needed" valuePropName="checked" initialValue={false}>
                    <Switch checkedChildren="有" unCheckedChildren="无" />
                  </Form.Item>
                  {motionNeeded && (
                    <>
                      <Form.Item label="动作来源" name="motion_source" rules={[{ required: true, message: '请选择' }]}>
                        <Radio.Group>
                          <Radio value="existing">使用已有动作</Radio>
                          <Radio value="custom">需要定制</Radio>
                        </Radio.Group>
                      </Form.Item>
                      {motionSource === 'existing' && (
                        <Form.Item label="选择动作（可多选）" name="motion_action_ids" rules={[{ required: true, message: '请选择' }]}>
                          <Select mode="multiple" placeholder="选择已有动作" options={filteredMotion.map(m => ({
                            value: m.id, label: m.name + (m.machine_model ? ' (' + m.machine_model + ')' : ''),
                          }))} />
                        </Form.Item>
                      )}
                    </>
                  )}
                </>
              )}

              {(danceSource === 'custom' || voiceSource === 'custom' || motionSource === 'custom') && (
                <Form.Item label="定制需求描述" name="custom_requirements">
                  <Input.TextArea rows={3} placeholder="请描述您的定制需求" />
                </Form.Item>
              )}
            </>
          )}

          <Divider />

          <Form.Item label="其他备注" name="notes">
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
