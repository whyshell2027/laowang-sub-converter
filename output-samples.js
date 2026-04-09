import { parseSubscription } from './server/utils/parsers.js'
import { convertToTarget } from './server/utils/converters.js'
import fs from 'fs'

const TEST_VLESS_NODE = 'vless://7157e685-dbb3-4803-b7ad-48b43a68d7c9@67.215.229.127:42758?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.amd.com&fp=chrome&pbk=En7uv3MxvYMeTVoEFP5BaFsmNN-vj7y7q_i5D91Mtjg&sid=1e390bcf&type=tcp&headerType=none#vl-reality-racknerd-7e5f292'

const nodes = parseSubscription(TEST_VLESS_NODE)

console.log('=== 各客户端格式输出示例 ===\n')

// Clash
console.log('--- Clash 格式 ---')
const clash = convertToTarget(nodes, 'clash', { udp: true, skipCert: false })
console.log(clash)

console.log('\n--- Surge 格式 ---')
const surge = convertToTarget(nodes, 'surge', { udp: true, skipCert: false })
console.log(surge)

console.log('\n--- Quantumult X 格式 ---')
const qx = convertToTarget(nodes, 'quantumultx', { udp: true, skipCert: false })
console.log(qx)

console.log('\n--- Loon 格式 ---')
const loon = convertToTarget(nodes, 'loon', { udp: true, skipCert: false })
console.log(loon)

console.log('\n--- V2RayN/Shadowrocket (Base64解码) 格式 ---')
const v2rayn = convertToTarget(nodes, 'v2rayn', { udp: true, skipCert: false })
const decoded = Buffer.from(v2rayn, 'base64').toString('utf-8')
console.log(decoded)

console.log('\n--- sing-box 格式 ---')
const singbox = convertToTarget(nodes, 'singbox', { udp: true, skipCert: false })
console.log(singbox)
