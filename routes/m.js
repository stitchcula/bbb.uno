/**
 * Created by stitchcula on 16-4-11.
 */

import Router from 'koa-router'
import request from 'co-request'
import parse from 'co-body'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.use('/',async (ctx,next)=>{
    if(!(ctx.session&&ctx.session.token))
        return ctx.render('redirectLogin')
    await next()
})

router.get('/',async (ctx,next)=>{
    var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,method:'GET'})
    res.body=JSON.parse(res.body)
    if(ctx.session.room) {
        var room=ctx.redis.hgetall(ctx.session.room)
        if(room.state==1)
            ctx.render('play',{user:res.body,without_footer:1})
        if(room.state==0)
            ctx.render('room',{user:res.body,without_footer:1})
    }else
        ctx.render('hall',{
            user:res.body,
            without_footer:1,
            title:"BBB - uno大厅",
            default_face:"/static/img/default_face.jpg",
            title_img:"/static/img/login_title_img.jpg",
            slides:[
                {img:"/static/img/bg1.jpg"},
                {img:"/static/img/bg2.jpg"},
                {img:"/static/img/bg3.jpg"}
            ]
        })
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