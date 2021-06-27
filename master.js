const fs = require('fs')
const cluster = require('cluster')
const Koa = require('koa')
const cpuNums = require('os').cpus().length
//提供沙箱的机制，避免eval中执行的方法修改全局上下文，但也不是绝对安全的，因为它可以通过原型链拿到主进程中的方法
//可以使用vm2(npm install vm2)，得到比原生vm更加安全的沙箱运行环境
// const vm = require('vm')
const { VM } = require('vm2')
// new VM().run('this.constructor.constructor("return process")().exit()') //process is not defined

if (cluster.isMaster) {
  //主进程根据cpu核心数量启动对应数量的子进程
  for (let i = 0; i < cpuNums; i++) {
    cluster.fork()
  }
} else {
  //子进程启动HTTP服务实例
  const app = new Koa()
  app.use(async ctx => ctx.respond.body = await run(ctx.request.path))
  //为什么cluster可以实现多进程共享端口？
  //调用listion之后，它会判断自己是否处于子进程状态，如果是，就向主进程发消息，告诉主进程需要监听指定端口。
  //主进程收到消息后，判断子进程要求监听的端口是否已经被监听，如果没有，就绑定，随后将子进程加入worker队列，子进程可以处理来自该端口的请求
  //新来请求的时候，实际还是主进程在监听，然后将请求分发给worker队列的子进程。cluster模块实现了代理逻辑、子进程管理以及负载均衡的方法
  app.listen(3000, 'Listion on：http://localhost:3000')
}


//根据路径执行函数
async function run(path) {
  try {
    const fn = fs.readFileSync(`./functions/${path}.js`, { encoding: 'utf-8' })
    const fnIIFE = `(${fn})()`
    //函数运行时长限制为5s，避免死循环的函数现象
    //但是还有一个问题：如果函数中使用微任务定义了死循环函数，由于vm使用的实现是宏任务setTimeout，微任务的优先级比宏任务高
    //那么VM的超时功能就没法生效。解决办法就是：在cluser模块中重写任务分发算法，在Round Robin算法基础上增加计时器。
    //超过计时器时间函数没返回就直接返回超时并结束子进程的生命周期，重新启动子进程
    //要么就放弃使用cluster模块，通过计时器控制子进程实现功能，但要自己实现进程池的管理逻辑
    return new VM({ timeout: 5000 }).run(fnIIFE)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return 'Not Found Function'
    }
    return e.toString()
  }
}
