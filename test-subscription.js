import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'

const TEST_SUBSCRIPTION_URL = 'https://sub3.smallstrawberry.com/api/v1/client/subscribe?token=0c1abe710e49ed0030dee96d7fbc8b14'

async function main() {
    console.log('测试机场订阅链接解析')
    
    try {
        const response = await fetch(TEST_SUBSCRIPTION_URL, {
            headers: { 'User-Agent': 'LaoWang-Sub-Converter/1.0' }
        })
        
        if (!response.ok) {
            console.log('获取订阅失败: HTTP', response.status)
            return
        }
        
        const rawContent = await response.text()
        console.log('获取到订阅内容 (' + rawContent.length + ' 字节)')
        
        const nodes = parseSubscription(rawContent)
        console.log('解析成功! 共', nodes.length, '个节点')
        
        if (nodes.length > 0) {
            const typeCount = {}
            for (const node of nodes) {
                typeCount[node.type] = (typeCount[node.type] || 0) + 1
            }
            console.log('节点类型统计:', JSON.stringify(typeCount))
            
            console.log('\n前5个节点:')
            nodes.slice(0, 5).forEach((node, i) => {
                console.log('  ' + (i+1) + '. [' + node.type + '] ' + node.name + ' - ' + node.server + ':' + node.port)
            })
            
            // 测试转换
            const targets = ['clash', 'surge', 'quantumultx', 'shadowrocket', 'loon', 'v2rayn', 'singbox']
            console.log('\n转换测试:')
            for (const target of targets) {
                try {
                    const output = convertToTarget(nodes, target, { udp: true, skipCert: false })
                    console.log('[' + target.toUpperCase() + '] 成功, 长度:', output.length)
                } catch (e) {
                    console.log('[' + target.toUpperCase() + '] 失败:', e.message)
                }
            }
        }
    } catch (e) {
        console.log('错误:', e.message)
    }
}

main()
