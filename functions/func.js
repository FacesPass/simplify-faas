(event, context) => {
  //由于在VM中的sandbox传入了set和get使用缓存的方法，所以在函数实例上可以直接调用
  set('message', 'this is a message')
  const message = get('message')  //this is a message
  return { message: 'function is running.', status: 'ok' }
}