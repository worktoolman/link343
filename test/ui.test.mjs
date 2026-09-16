/* ============================================
   UI 工具测试（金额输入清洗）
   运行：node test/ui.test.mjs
   ============================================ */

const { sanitizeAmount, escapeHtml } = await import('../src/ui.js')

let pass = 0
const fails = []

function check(input, expected) {
  const actual = sanitizeAmount(input)
  if (actual === expected) {
    pass++
    console.log(`  ✓ ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`)
  } else {
    fails.push(`  ✗ ${JSON.stringify(input)} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
    console.log(fails.at(-1))
  }
}

console.log('\n【金额输入清洗】')

console.log('  — 正常输入 —')
check('12.5', '12.5')
check('0.05', '0.05')
check('1234.56', '1234.56')
check('100', '100')

console.log('  — 超两位小数 —')
check('12.345', '12.34')
check('1.999', '1.99')

console.log('  — 多个小数点 —')
check('1.2.3', '1.23')
check('1..2', '1.2')
check('...5', '.5')

console.log('  — 非法字符 —')
check('abc', '')
check('12a3', '123')
check('￥50', '50')
check('1e5', '15')
check('-30', '30')
check(' 12 ', '12')

console.log('  — 前导零 —')
check('01', '1')
check('0012.5', '12.5')
check('0', '0')
check('0.', '0.')
check('0.00', '0.00')

console.log('  — 中间态（用户正在输入）—')
check('', '')
check('.', '.')
check('12.', '12.')
check('1.', '1.')

console.log('  — 空值 —')
check(null, '')
check(undefined, '')
check(NaN, '')

console.log('\n【HTML 转义】')

function checkEsc(input, expected) {
  const actual = escapeHtml(input)
  if (actual === expected) {
    pass++
    console.log(`  ✓ ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`)
  } else {
    fails.push(
      `  ✗ ${JSON.stringify(input)} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`
    )
    console.log(fails.at(-1))
  }
}

checkEsc('<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;')
checkEsc('a & b', 'a &amp; b')
checkEsc('他说"你好"', '他说&quot;你好&quot;')
checkEsc("it's", 'it&#39;s')
checkEsc('午饭', '午饭')
checkEsc('', '')
checkEsc('已转义 &amp;', '已转义 &amp;amp;')

console.log('  — 模拟注入：备注里塞标签 —')
checkEsc('"><img src=x>', '&quot;&gt;&lt;img src=x&gt;')

console.log('\n' + '─'.repeat(40))
if (fails.length === 0) {
  console.log(`✅ 全部通过：${pass} 项`)
  process.exit(0)
} else {
  console.log(`❌ ${fails.length} 项失败，${pass} 项通过`)
  process.exit(1)
}
