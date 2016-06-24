/**
 * Created by stitchcula on 16-4-11.
 */

import Router from 'koa-router'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.use('/',async (ctx,next)=>{
    if(!(ctx.session&&ctx.session.token))
        return ctx.render('redirectLogin')
    await next()
})

router.get('/',async (ctx,next)=>{
    var res=await request({uri:proxyHost+ctx.path+"?token=000002"+ctx.session.token,method:'GET'})
    if(ctx.session.room) {
        var room=ctx.redis.hgetall(ctx.session.room)
        if(room.state==1)
            ctx.render('play',{user:res.body,without_footer:1})
        if(room.state==0)
            ctx.render('room',{user:res.body,without_footer:1})
    }else
        ctx.render('hall',{user:res.body,without_footer:1})
    await next()
})

//room get(delete) new in
router.get('/room',async (ctx,next)=>{
    var res=await ctx.redis.hgetall(ctx.query.uin)
    if(res)
        ctx.body={timestamp:res.timestamp,temp:res.data[0],humi:res.data[1],co:res.data[2]}
    else
        ctx.body={result:404}
    await next();
})

//card get post
router.get('/card',async (ctx,next)=>{
    var res=await ctx.redis.hgetall(ctx.query.uin)
    if(res)
        ctx.body={timestamp:res.timestamp,temp:res.data[0],humi:res.data[1],co:res.data[2]}
    else
        ctx.body={result:404}
    await next();
}).post('/card',async (ctx,next)=>{
    var res=await ctx.redis.hgetall(ctx.query.uin)
    if(res)
        ctx.body={timestamp:res.timestamp,temp:res.data[0],humi:res.data[1],co:res.data[2]}
    else
        ctx.body={result:404}
    await next();
})

export {router}