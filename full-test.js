import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

const TEST_SUBSCRIPTION_URL = 'https://sub3.smallstrawberry.com/api/v1/client/subscribe?token=0c1abe710e49ed0030dee96d7fbc8b14'
const TEST_VLESS_NODE = 'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp&headerType=none#vl-reality-racknerd-7e5f292'

const TARGETS = ['clash', 'clashmeta', 'surge', 'quantumultx', 'shadowrocket', 'loon', 'v2rayn', 'v2rayng', 'singbox', 'stash', 'surfboard']

async function main() {
    console.log('')
    console.log('     LaoWang Sub-converter 全面转换测试报告                  ')
    console.log('')
    
    // 测试1: 解析单个 VLESS Reality 节点
    console.log('\n 测试1: VLESS Reality 单节点解析')
    console.log(''.repeat(60))
    
    const singleNode = parseSubscription(TEST_VLESS_NODE)
    
    if (singleNode.length === 0) {
        console.log(' VLESS Reality 节点解析失败!')
        return
    }
    
    const node = singleNode[0]
    console.log('节点名称:', node.name)
    console.log('服务器:', node.server + ':' + node.port)
    console.log('协议:', node.type)
    console.log('UUID:', node.uuid.substring(0, 8) + '...')
    console.log('Flow:', node.flow || '无')
    console.log('Reality:', node.reality ? ' 已配置' : ' 未配置')
    if (node.reality) {
        console.log('  - SNI:', node.reality.sni)
        console.log('  - Public Key:', node.reality.publicKey.substring(0, 20) + '...')
        console.log('  - Short ID:', node.reality.shortId)
    }
    console.log('\n VLESS Reality 节点解析成功!')
    
    // 测试2: 单节点转换测试
    console.log('\n 测试2: VLESS Reality 节点转换到各客户端格式')
    console.log(''.repeat(60))
    
    const results = []
    for (const target of TARGETS) {
        try {
            const output = convertToTarget(singleNode, target, { udp: true, skipCert: false })
            const hasVless = output.toLowerCase().includes('vless') || 
                            output.includes(node.uuid) || 
                            output.includes(node.server)
            results.push({ target, status: '', length: output.length, hasVless })
            console.log('[' + target.toUpperCase().padEnd(12) + ']  成功 | 长度: ' + output.length.toString().padStart(5) + ' | VLESS: ' + (hasVless ? '' : ''))
        } catch (e) {
            results.push({ target, status: '', error: e.message })
            console.log('[' + target.toUpperCase().padEnd(12) + ']  失败 | 错误: ' + e.message)
        }
    }
    
    // 测试3: 订阅链接解析
    console.log('\n 测试3: 机场订阅链接解析和转换')
    console.log(''.repeat(60))
    
    try {
        const response = await fetch(TEST_SUBSCRIPTION_URL, {
            headers: { 'User-Agent': 'LaoWang-Sub-Converter/1.0' }
        })
        
        if (!response.ok) {
            console.log(' 获取订阅失败: HTTP', response.status)
            return
        }
        
        const rawContent = await response.text()
        console.log('订阅内容大小:', rawContent.length, '字节')
        
        const nodes = parseSubscription(rawContent)
        console.log('解析节点数:', nodes.length)
        
        // 统计节点类型
        const typeCount = {}
        for (const n of nodes) {
            typeCount[n.type] = (typeCount[n.type] || 0) + 1
        }
        console.log('节点类型分布:')
        for (const [type, count] of Object.entries(typeCount)) {
            console.log('  - ' + type.toUpperCase() + ': ' + count + ' 个')
        }
        
        // 测试转换到所有格式
        console.log('\n订阅转换测试:')
        for (const target of TARGETS) {
            try {
                const output = convertToTarget(nodes, target, { udp: true, skipCert: false })
                console.log('[' + target.toUpperCase().padEnd(12) + ']  成功 | 长度: ' + output.length.toString().padStart(6))
            } catch (e) {
                console.log('[' + target.toUpperCase().padEnd(12) + ']  失败 | 错误: ' + e.message)
            }
        }
        
        // 显示示例输出
        console.log('\n 测试4: 输出示例 (Clash 格式前500字符)')
        console.log(''.repeat(60))
        const clashOutput = convertToTarget(nodes, 'clash', { udp: true, skipCert: false })
        console.log(clashOutput.substring(0, 500))
        
        console.log('\n 测试5: 输出示例 (V2RayN Base64 解码后前5个节点)')
        console.log(''.repeat(60))
        const v2raynOutput = convertToTarget(nodes, 'v2rayn', { udp: true, skipCert: false })
        const decoded = Buffer.from(v2raynOutput, 'base64').toString('utf-8')
        const lines = decoded.split('\n').slice(0, 5)
        lines.forEach((line, i) => {
            console.log((i+1) + '. ' + (line.length > 80 ? line.substring(0, 80) + '...' : line))
        })
        
    } catch (e) {
        console.log(' 订阅测试错误:', e.message)
    }
    
    // 总结
    console.log('\n')
    console.log('                        测试总结                             ')
    console.log('')
    
    const passed = results.filter(r => r.status === '').length
    const failed = results.filter(r => r.status === '').length
    console.log('单节点转换: ' + passed + '/' + TARGETS.length + ' 通过')
    if (failed > 0) {
        console.log('失败的格式:')
        results.filter(r => r.status === '').forEach(r => {
            console.log('  - ' + r.target + ': ' + r.error)
        })
    }
    console.log('\n测试完成!')
}

main().catch(console.error)
