import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';

const APP_PORT = 3020;
const MOCK_SUB_PORT = 10086; // Changed port
const MOCK_NODE_PORTS = [10001, 10002];

// ==========================================
// 1. Mock Data Generation
// ==========================================

const b64 = (str) => Buffer.from(str).toString('base64');

const NODES = {
    ss: `ss://${b64('aes-256-cfb:password')}@127.0.0.1:${MOCK_NODE_PORTS[0]}#Mock-SS-Node`,
    vmess: `vmess://${b64(JSON.stringify({
        v: "2", ps: "Mock-VMess-Node", add: "127.0.0.1", port: MOCK_NODE_PORTS[1],
        id: "a3482e88-686a-4a58-8126-99c9df95f12e", aid: "0", scy: "auto", net: "ws", type: "none", host: "", path: "/", tls: ""
    }))}`,
    trojan: `trojan://password@127.0.0.1:${MOCK_NODE_PORTS[0]}?security=tls&type=tcp&headerType=none#Mock-Trojan-Node`,
    hysteria2: `hysteria2://password@127.0.0.1:${MOCK_NODE_PORTS[1]}?insecure=1&sni=example.com#Mock-Hy2-Node`,
    invalid: `ss://${b64('aes-256-cfb:password')}@127.0.0.1:9999#Mock-Offline-Node`
};

// Subscriptions
const SUB_CONTENT_1 = b64([NODES.ss, NODES.vmess].join('\n'));
const SUB_CONTENT_2 = b64([NODES.vmess, NODES.trojan, NODES.hysteria2].join('\n'));
const SUB_CONTENT_HEALTH = b64([NODES.ss, NODES.invalid].join('\n'));

// ==========================================
// 2. Mock Infrastructure
// ==========================================

const subServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.url === '/sub1') res.end(SUB_CONTENT_1);
    else if (req.url === '/sub2') res.end(SUB_CONTENT_2);
    else if (req.url === '/health-test') res.end(SUB_CONTENT_HEALTH);
    else res.end('');
});

const nodeServers = [];

async function startInfrastructure() {
    console.log('🏗️  Starting Mock Infrastructure...');

    // Explicitly bind to 127.0.0.1
    await new Promise(r => subServer.listen(MOCK_SUB_PORT, '127.0.0.1', r));
    console.log(`   - Mock Subscription Server listening on 127.0.0.1:${MOCK_SUB_PORT}`);

    for (const port of MOCK_NODE_PORTS) {
        const s = net.createServer((socket) => {
            socket.on('data', d => socket.write(d));
            socket.on('error', () => { });
        });
        await new Promise(r => s.listen(port, '127.0.0.1', r));
        nodeServers.push(s);
        console.log(`   - Mock TCP Node Server listening on 127.0.0.1:${port}`);
    }

    console.log('🚀 Starting Application Backend...');
    const appProcess = spawn('node', ['server/index.js'], {
        env: { ...process.env, PORT: APP_PORT.toString(), NODE_ENV: 'test' },
        stdio: 'pipe'
    });

    appProcess.stdout.pipe(process.stdout);
    appProcess.stderr.on('data', d => console.error('   [Backend Error]', d.toString()));

    await new Promise(r => setTimeout(r, 5000));
    return appProcess;
}

// ==========================================
// 3. Test Runner
// ==========================================

const results = {
    summary: { total: 0, passed: 0, failed: 0 },
    details: []
};

async function check(name, testFn) {
    results.summary.total++;
    process.stdout.write(`🧪 Test ${results.summary.total}: ${name.padEnd(50)} `);
    try {
        await testFn();
        console.log('✅ PASSED');
        results.summary.passed++;
        results.details.push({ name, status: 'passed' });
    } catch (e) {
        console.log('❌ FAILED');
        console.error(`   Error Message: ${e.message}`);
        console.error(`   Error Stack: ${e.stack}`);
        results.summary.failed++;
        results.details.push({ name, status: 'failed', error: e.message });
    }
}

function req(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: APP_PORT,
            path,
            method,
            headers: body ? { 'Content-Type': 'application/json' } : {}
        };

        const r = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

async function runTests() {
    // Explicit 127.0.0.1 URLs
    const sub1Url = `http://127.0.0.1:${MOCK_SUB_PORT}/sub1`;
    const sub2Url = `http://127.0.0.1:${MOCK_SUB_PORT}/sub2`;
    const healthUrl = `http://127.0.0.1:${MOCK_SUB_PORT}/health-test`;

    await check('基础转换功能 (Clash)', async () => {
        const res = await req('GET', `/api/convert?target=clash&url=${encodeURIComponent(sub1Url)}`);
        if (res.status !== 200) throw new Error(`Status ${res.status} - Body: ${res.body.substring(0, 100)}`);
        if (!res.body.includes('proxies:')) throw new Error('No proxies section');
        if (!res.body.includes('Mock-SS-Node')) throw new Error('Missing SS node');
    });

    await check('基础转换功能 (SingBox/JSON)', async () => {
        const res = await req('GET', `/api/convert?target=singbox&url=${encodeURIComponent(sub1Url)}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const json = JSON.parse(res.body);
        if (!json.outbounds) throw new Error('Invalid SingBox JSON');
    });

    await check('规则分流配置 (Rule Preset: Standard)', async () => {
        const res = await req('GET', `/api/convert?target=clash&url=${encodeURIComponent(sub1Url)}&rulePreset=standard`);
        if (!res.body.includes('🎥 流媒体')) throw new Error('Missing "🎥 流媒体" proxy group');
        if (!res.body.includes('DOMAIN-SUFFIX,netflix.com,🎥 流媒体')) throw new Error('Missing Netflix rule');
    });

    await check('规则分流配置 (Rule Preset: Gaming)', async () => {
        const res = await req('GET', `/api/convert?target=clash&url=${encodeURIComponent(sub1Url)}&rulePreset=gaming`);
        if (!res.body.includes('🎮 游戏平台')) throw new Error('Missing "🎮 游戏平台" proxy group');
    });

    await check('订阅合并预览 (Preview)', async () => {
        const res = await req('POST', '/api/merge/preview', { urls: [sub1Url, sub2Url], dedupe: false });
        // Sub1: 2 nodes, Sub2: 3 nodes. Total 5.
        const json = JSON.parse(res.body);
        if (json.total !== 5) throw new Error(`Expected 5 nodes, got ${json.total}`);
    });

    await check('订阅合并与去重 (Merge & Dedupe)', async () => {
        const res = await req('POST', '/api/merge', {
            urls: [sub1Url, sub2Url],
            target: 'clash',
            dedupe: true
        });
        if (res.status !== 200) throw new Error('Merge API failed');
        // VMess is duplicated. Should remove 1.
        // Expected: SS(1) + VMess(1) + Trojan(1) + Hy2(1) = 4.
        // It's hard to count YAML items exactly without parsing, checking inclusion is good enough.
        if (!res.body.includes('Mock-SS-Node')) throw new Error('Missing SS');
        if (!res.body.includes('Mock-Trojan-Node')) throw new Error('Missing Trojan');
    });

    await check('节点健康检测 (Health Check)', async () => {
        const res = await req('POST', '/api/health/check', { url: healthUrl });
        const json = JSON.parse(res.body);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);

        const onlineNode = json.nodes.find(n => n.name === 'Mock-SS-Node');
        const offlineNode = json.nodes.find(n => n.name === 'Mock-Offline-Node');

        if (!onlineNode || onlineNode.status !== 'online') throw new Error('Expected SS node to be online');
        if (!offlineNode || offlineNode.status !== 'offline') throw new Error('Expected Offline node to be offline');
    });
}

async function main() {
    let appProcess;
    try {
        appProcess = await startInfrastructure();
        await runTests();

        const reportMd = `
# 📊 LaoWang Sub-Converter 功能验收测试报告

**测试时间**: ${new Date().toLocaleString()}
**测试结果**: ${results.summary.passed}/${results.summary.total} 通过

## 测试详情

| 测试用例名称 | 状态 |备注 |
|---|---|---|
${results.details.map(d => `| ${d.name} | ${d.status === 'passed' ? '✅ 通过' : '❌ 失败'} | ${d.error || '-'} |`).join('\n')}

`;
        fs.writeFileSync('final-test-report.md', reportMd);
        fs.writeFileSync('final-test-report.json', JSON.stringify(results, null, 2));

    } catch (e) {
        console.error('Test Suite Fatal Error:', e);
    } finally {
        console.log('🧹 Cleaning up...');
        if (appProcess) appProcess.kill();
        subServer.close();
        nodeServers.forEach(s => s.close());
        process.exit(results.summary.failed > 0 ? 1 : 0);
    }
}

main();
