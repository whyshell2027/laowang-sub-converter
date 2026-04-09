import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

const TEST_SUBSCRIPTION_URL = 'https://sub3.smallstrawberry.com/api/v1/client/subscribe?token=0c1abe710e49ed0030dee96d7fbc8b14'
const TARGETS = ['clash', 'surge', 'quantumultx', 'shadowrocket', 'loon', 'v2rayn', 'singbox']

async function testSubscription() {
    console.log('=== 机场订阅链接测试 ===')
    
    const response = await fetch(TEST_SUBSCRIPTION_URL, {
        headers: { 'User-Agent': 'LaoWang-Sub-Converter/1.0' }
    })
    
    if (!response.ok) {
        console.log('获取订阅失败:', response.status)
        return
    }
    
    const rawContent = await response.text()
    console.log('订阅内容:', rawContent.length, '字节')
    
    const nodes = parseSubscription(rawContent)
    console.log('解析节点:', nodes.length, '个')
    
    // 统计节点类型
    const typeCount = {}
    for (const n of nodes) {
        typeCount[n.type] = (typeCount[n.type] || 0) + 1
    }
    console.log('节点类型:', JSON.stringify(typeCount))
    
    console.log('\n转换测试:')
    for (const target of TARGETS) {
        try {
            const output = convertToTarget(nodes, target, { udp: true, skipCert: false })
            console.log(target.padEnd(15) + ': ' + output.length + ' chars - OK')
        } catch (e) {
            console.log(target.padEnd(15) + ': FAILED - ' + e.message)
        }
    }
    
    // 输出 Clash 配置示例
    console.log('\n=== Clash 配置示例 ===')
    const clashOutput = convertToTarget(nodes, 'clash', { udp: true, skipCert: false })
    console.log(clashOutput.substring(0, 800))
}

testSubscription().catch(console.error)
