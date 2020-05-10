module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'chore', // 新增依赖
        'docs', // 文档
        'feat', // 新特性
        'fix', // bug修复
        'perf', // 性能优化
        'refactor', // 功能重构
        'revert', // 代码回滚
        'style', // 样式
        'test' // 测试
      ]
    ]
  }
}
