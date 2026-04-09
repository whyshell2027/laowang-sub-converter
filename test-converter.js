// 测试脚本 - 用于验证订阅转换功能
import { parseSubscription, addEmoji } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

const TEST_VLESS_NODE = 'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp&headerType=none#vl-reality-racknerd-7e5f292'

async function main() {
    console.log('LaoWang Sub-converter 转换功能测试')
    
    // 测试1: 解析单个 VLESS Reality 节点
    console.log('测试1: 解析单个 VLESS Reality 节点')
    
    const singleNode = parseSubscription(TEST_VLESS_NODE)
    console.log('解析结果:', JSON.stringify(singleNode, null, 2))
    
    if (singleNode.length === 0) {
        console.log('VLESS 节点解析失败!')
    } else {
        console.log('VLESS 节点解析成功!')
        
        const targets = ['clash', 'surge', 'quantumultx', 'shadowrocket', 'loon', 'v2rayn', 'singbox']
        
        for (const target of targets) {
            try {
                const output = convertToTarget(singleNode, target, { udp: true, skipCert: false })
                console.log('[' + target.toUpperCase() + '] 转换成功, 长度:', output.length)
            } catch (e) {
                console.log('[' + target.toUpperCase() + '] 转换失败:', e.message)
            }
        }
    }
}

main().catch(console.error)
