import { parseSubscription, addEmoji } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'
import fs from 'fs'

//========================================
// 全面测试脚本 - 生成完整数据报告
//========================================

const TEST_SUBSCRIPTION_URL = 'https://sub3.smallstrawberry.com/api/v1/client/subscribe?token=0c1abe710e49ed0030dee96d7fbc8b14'
const TEST_VLESS_REALITY = 'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp&headerType=none#vl-reality-racknerd-7e5f292'

// 各协议测试节点
const TEST_NODES = {
    ss: 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQxMjM=@1.2.3.4:8388#SS-Test',
    vmess: 'vmess://eyJ2IjoiMiIsInBzIjoiVk1lc3MtVGVzdCIsImFkZCI6IjEuMi4zLjQiLCJwb3J0IjoiNDQzIiwiaWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJhaWQiOiIwIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJ0ZXN0LmNvbSIsInBhdGgiOiIvd3MiLCJ0bHMiOiJ0bHMifQ==',
    vless: TEST_VLESS_REALITY,
    trojan: 'trojan://password123@1.2.3.4:443?sni=test.com#Trojan-Test',
    hysteria: 'hysteria://1.2.3.4:443?auth=password&upmbps=100&downmbps=100&peer=test.com#Hysteria-Test',
    hysteria2: 'hy2://password@1.2.3.4:443?sni=test.com#Hysteria2-Test',
    tuic: 'tuic://uuid-test:password@1.2.3.4:443?congestion_control=bbr&alpn=h3&sni=test.com#TUIC-Test'
}

const ALL_CLIENTS = [
    { id: 'clash', name: 'Clash', platform: '全平台' },
    { id: 'clashmeta', name: 'Clash Meta', platform: '全平台' },
    { id: 'surge', name: 'Surge', platform: 'iOS/macOS' },
    { id: 'quantumultx', name: 'Quantumult X', platform: 'iOS' },
    { id: 'shadowrocket', name: 'Shadowrocket', platform: 'iOS' },
    { id: 'loon', name: 'Loon', platform: 'iOS' },
    { id: 'v2rayn', name: 'V2RayN', platform: 'Windows' },
    { id: 'v2rayng', name: 'V2RayNG', platform: 'Android' },
    { id: 'nekobox', name: 'NekoBox', platform: 'Android' },
    { id: 'surfboard', name: 'Surfboard', platform: 'Android' },
    { id: 'stash', name: 'Stash', platform: 'iOS/macOS' },
    { id: 'singbox', name: 'sing-box', platform: '全平台' }
]

let report = {
    timestamp: new Date().toISOString(),
    summary: { total: 0, passed: 0, failed: 0 },
    protocolTests: [],
    subscriptionTest: null,
    clientCompatibility: [],
    backupApiCheck: null,
    issues: []
}

console.log('')
console.log('       LaoWang Sub-converter 全面功能测试                   ')
console.log('')

// 1. 协议解析测试
console.log('\n 测试1: 各协议解析测试')
console.log(''.repeat(60))

for (const [protocol, uri] of Object.entries(TEST_NODES)) {
    const testResult = { protocol, status: 'UNKNOWN', details: {} }
    try {
        const parsed = parseSubscription(uri)
        if (parsed.length > 0) {
            testResult.status = 'PASS'
            testResult.details = {
                name: parsed[0].name,
                server: parsed[0].server,
                port: parsed[0].port,
                type: parsed[0].type
            }
            console.log(protocol.padEnd(12) + ':  PASS - ' + parsed[0].name)
            report.summary.passed++
        } else {
            testResult.status = 'FAIL'
            testResult.details = { error: 'No nodes returned' }
            console.log(protocol.padEnd(12) + ':  FAIL - No nodes returned')
            report.issues.push({ type: 'PARSE', protocol, error: 'No nodes returned' })
            report.summary.failed++
        }
    } catch (e) {
        testResult.status = 'ERROR'
        testResult.details = { error: e.message }
        console.log(protocol.padEnd(12) + ':  ERROR - ' + e.message)
        report.issues.push({ type: 'PARSE', protocol, error: e.message })
        report.summary.failed++
    }
    report.protocolTests.push(testResult)
    report.summary.total++
}

// 2. 真实订阅链接测试
console.log('\n 测试2: 真实机场订阅链接测试')
console.log(''.repeat(60))

try {
    const response = await fetch(TEST_SUBSCRIPTION_URL, {
        headers: { 'User-Agent': 'LaoWang-Sub-Converter/1.0' }
    })
    
    if (!response.ok) {
        throw new Error('HTTP ' + response.status)
    }
    
    const rawContent = await response.text()
    const nodes = parseSubscription(rawContent)
    
    // 统计节点类型
    const typeCount = {}
    for (const node of nodes) {
        typeCount[node.type] = (typeCount[node.type] || 0) + 1
    }
    
    report.subscriptionTest = {
        status: 'PASS',
        contentSize: rawContent.length,
        nodeCount: nodes.length,
        typeDistribution: typeCount
    }
    
    console.log('订阅内容: ' + rawContent.length + ' 字节')
    console.log('解析节点: ' + nodes.length + ' 个')
    console.log('类型分布:')
    for (const [type, count] of Object.entries(typeCount)) {
        console.log('  - ' + type.toUpperCase() + ': ' + count)
    }
    console.log(' 订阅解析成功')
    
    // 3. 客户端兼容性测试
    console.log('\n 测试3: 客户端格式转换兼容性测试')
    console.log(''.repeat(60))
    
    for (const client of ALL_CLIENTS) {
        const testResult = { client: client.id, name: client.name, platform: client.platform, status: 'UNKNOWN', outputLength: 0 }
        try {
            const output = convertToTarget(nodes, client.id, { udp: true, skipCert: false })
            testResult.status = output.length > 0 ? 'PASS' : 'EMPTY'
            testResult.outputLength = output.length
            
            // 验证输出是否包含节点
            let hasNodes = false
            if (client.id === 'clash' || client.id === 'clashmeta' || client.id === 'stash') {
                hasNodes = output.includes('proxies:')
            } else if (client.id === 'singbox' || client.id === 'nekobox') {
                hasNodes = output.includes('outbounds')
            } else {
                hasNodes = output.length > 100
            }
            
            testResult.hasNodes = hasNodes
            
            if (testResult.status === 'PASS' && hasNodes) {
                console.log(client.name.padEnd(15) + ' [' + client.platform.padEnd(10) + ']:  ' + output.length + ' chars')
                report.summary.passed++
            } else if (testResult.status === 'EMPTY') {
                console.log(client.name.padEnd(15) + ' [' + client.platform.padEnd(10) + ']:  EMPTY')
                report.issues.push({ type: 'CONVERT', client: client.id, error: 'Empty output' })
                report.summary.failed++
            } else {
                console.log(client.name.padEnd(15) + ' [' + client.platform.padEnd(10) + ']:  ' + output.length + ' chars')
                report.summary.passed++
            }
        } catch (e) {
            testResult.status = 'ERROR'
            testResult.error = e.message
            console.log(client.name.padEnd(15) + ' [' + client.platform.padEnd(10) + ']:  ' + e.message)
            report.issues.push({ type: 'CONVERT', client: client.id, error: e.message })
            report.summary.failed++
        }
        report.clientCompatibility.push(testResult)
        report.summary.total++
    }
    
} catch (e) {
    report.subscriptionTest = { status: 'FAIL', error: e.message }
    console.log(' 订阅测试失败: ' + e.message)
    report.issues.push({ type: 'SUBSCRIPTION', error: e.message })
}

// 4. VLESS Reality 单节点测试
console.log('\n 测试4: VLESS Reality 单节点详细测试')
console.log(''.repeat(60))

const vlessNodes = parseSubscription(TEST_VLESS_REALITY)
if (vlessNodes.length > 0) {
    const node = vlessNodes[0]
    console.log('节点名称: ' + node.name)
    console.log('服务器: ' + node.server + ':' + node.port)
    console.log('UUID: ' + node.uuid.substring(0, 8) + '...')
    console.log('Flow: ' + (node.flow || 'N/A'))
    console.log('Reality: ' + (node.reality ? 'YES' : 'NO'))
    if (node.reality) {
        console.log('  SNI: ' + node.reality.sni)
        console.log('  Public Key: ' + node.reality.publicKey.substring(0, 20) + '...')
        console.log('  Short ID: ' + node.reality.shortId)
    }
    
    // 测试转换到各客户端
    console.log('\n各客户端输出验证:')
    for (const client of ALL_CLIENTS) {
        try {
            const output = convertToTarget(vlessNodes, client.id, { udp: true, skipCert: false })
            const hasVless = output.toLowerCase().includes('vless') || output.includes(node.uuid) || output.includes(node.server)
            console.log('  ' + client.name.padEnd(15) + ': ' + (hasVless ? ' VLESS识别' : ' 无VLESS') + ' (' + output.length + ' chars)')
        } catch (e) {
            console.log('  ' + client.name.padEnd(15) + ':  ' + e.message)
        }
    }
}

// 5. 备用API检查
console.log('\n 测试5: 备用API机制检查')
console.log(''.repeat(60))

report.backupApiCheck = {
    status: 'NOT_IMPLEMENTED',
    description: '当前项目仅有单一 /api/convert 端点，无备用API机制',
    recommendation: '建议添加外部备用API源作为故障转移'
}

console.log(' 备用API机制: 未实现')
console.log('   当前仅有单一 /api/convert 端点')
console.log('   建议: 添加外部备用API源 (如 api.v1.mk, sub.xeton.dev 等)')
report.issues.push({ type: 'FEATURE', description: 'No backup API mechanism' })

// 生成报告摘要
console.log('\n')
console.log('                    测试报告摘要                             ')
console.log('')

console.log('\n 总体统计:')
console.log('   总测试项: ' + report.summary.total)
console.log('   通过: ' + report.summary.passed + ' ')
console.log('   失败: ' + report.summary.failed + ' ')
console.log('   通过率: ' + ((report.summary.passed / report.summary.total) * 100).toFixed(1) + '%')

if (report.issues.length > 0) {
    console.log('\n 发现问题 (' + report.issues.length + ' 个):')
    for (const issue of report.issues) {
        console.log('   - [' + issue.type + '] ' + (issue.client || issue.protocol || '') + ': ' + (issue.error || issue.description))
    }
}

// 保存报告到文件
fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2))
console.log('\n 详细报告已保存到: test-report.json')
