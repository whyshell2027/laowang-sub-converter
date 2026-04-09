import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

// 测试节点
const testNodes = [
    // Hysteria
    'hysteria://example.com:443?auth=password123&upmbps=100&downmbps=100&obfs=xplus&peer=example.com#Hysteria-Test',
    // Hysteria2
    'hy2://password@example.com:443?sni=example.com#Hysteria2-Test',
    // TUIC
    'tuic://uuid-here:password@example.com:443?congestion_control=bbr&alpn=h3&sni=example.com#TUIC-Test',
    // SSR
    'ssr://dGVzdC5jb206ODM4ODpvcmlnaW46YWVzLTI1Ni1jZmI6cGxhaW46ZEdWemRIQmhjM04=',
    // 之前的 VLESS Reality
    'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp#VLESS-Reality'
]

const TARGETS = ['clash', 'singbox', 'nekobox', 'v2rayn', 'shadowrocket']

console.log('=== 新协议解析测试 ===\n')

for (const node of testNodes) {
    const protocol = node.split('://')[0]
    console.log('协议:', protocol.toUpperCase())
    
    try {
        const parsed = parseSubscription(node)
        if (parsed.length > 0) {
            console.log('  解析: SUCCESS')
            console.log('  名称:', parsed[0].name)
            console.log('  服务器:', parsed[0].server + ':' + parsed[0].port)
        } else {
            console.log('  解析: FAILED')
        }
    } catch (e) {
        console.log('  解析错误:', e.message)
    }
    console.log('')
}

// 测试转换
console.log('=== 转换测试 ===\n')
const allParsed = []
for (const node of testNodes) {
    const parsed = parseSubscription(node)
    if (parsed.length > 0) allParsed.push(...parsed)
}
console.log('解析节点总数:', allParsed.length)

for (const target of TARGETS) {
    try {
        const output = convertToTarget(allParsed, target, { udp: true, skipCert: false })
        console.log(target.padEnd(15) + ': ' + output.length + ' chars - OK')
    } catch (e) {
        console.log(target.padEnd(15) + ': FAILED - ' + e.message)
    }
}
