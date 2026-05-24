const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('前端代码质量检查');
console.log('='.repeat(60));

let success = true;

try {
  console.log('🔍 [前端] 运行 ESLint 检查...');
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ [前端] ESLint 检查通过\n');
} catch (error) {
  console.log('❌ [前端] ESLint 检查失败，请修复问题\n');
  success = false;
}

if (success) {
  try {
    console.log('🔍 [前端] 构建检查...');
    execSync('npm run build:preview', { stdio: 'inherit' });
    console.log('✅ [前端] 构建检查通过\n');
  } catch (error) {
    console.log('❌ [前端] 构建检查失败，请修复问题\n');
    success = false;
  }
}

console.log('='.repeat(60));
if (success) {
  console.log('✅ [前端] 所有检查通过');
  process.exit(0);
} else {
  console.log('❌ [前端] 检查失败，请修复问题');
  process.exit(1);
}
