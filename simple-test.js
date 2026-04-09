import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

const TEST_VLESS_NODE = 'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp&headerType=none#vl-reality-racknerd-7e5f292'

const TARGETS = ['clash', 'surge', 'quantumultx', 'shadowrocket', 'loon', 'v2rayn', 'singbox']

async function testSingleNode() {
    console.log('=== VLESS Reality 单节点测试 ===')
    
    const nodes = parseSubscription(TEST_VLESS_NODE)
    console.log('解析结果:', nodes.length > 0 ? 'SUCCESS' : 'FAILED')
    
    if (nodes.length > 0) {
        const node = nodes[0]
        console.log('节点:', node.name)
        console.log('Reality:', node.reality ? 'YES' : 'NO')
        console.log('Flow:', node.flow)
        
        console.log('\n转换测试:')
        for (const target of TARGETS) {
            const output = convertToTarget(nodes, target, { udp: true, skipCert: false })
            console.log(target.padEnd(15) + ': ' + output.length + ' chars - ' + (output.length > 0 ? 'OK' : 'FAIL'))
        }
    }
}

testSingleNode()
