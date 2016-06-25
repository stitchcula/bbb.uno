"use strict"

import Router from 'koa-router'
import request from 'co-request'
import parse from 'co-body'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.post('/signup',async (ctx,next)=>{
    var res=await request({uri:proxyHost+ctx.path+"?token=000000000000000000000000",
        method:"POST",body:JSON.stringify(await parse.json(ctx))})
    res.body=JSON.parse(res.body)
    if(res.body.result==200){
        var res2=await request({uri:proxyHost+"/user/oauth?uin="+res.body.uin+"&token=000002"+res.body.token.substring(6,24),
            method:"POST"})
        res2.body=JSON.parse(res2.body)
        if(res2.body.result==200){
            ctx.body=res.body
            ctx.session.token=ctx.body.token.substring(6,24)
            ctx.session.uin=ctx.body.uin
        }
    }else
        ctx.body=res
    await next()
})

router.get('/login',async (ctx,next)=>{
    ctx.render('login',{
        title:"登陆",
        default_face:"/static/img/default_face.jpg",
        title_img:"/static/img/login_title_img.jpg",
        off_footer:1,
        slides:[
            {img:"/static/img/bg1.jpg"},
            {img:"/static/img/bg2.jpg"},
            {img:"/static/img/bg3.jpg"}
        ]
    })
    await next()
}).post('/login',async (ctx,next)=>{
    var res=await request({uri:proxyHost+ctx.path+"?token=000002000000000000000000",
        method:"POST",body:JSON.stringify(await parse.json(ctx))})
    ctx.body=JSON.parse(res.body)
    ctx.session.token=ctx.body.token.substring(6,24)
    ctx.session.uin=ctx.body.uin
    await next();
})

router.get('/',async (ctx,next)=>{
    if(!ctx.session.token)
        return ctx.render('redirectLogin')
    var res=await request({uri:proxyHost+ctx.path+"?token=000002"+ctx.session.token,method:'GET'})
    ctx.body=res.body
    await next();
})

router.put('/',async (ctx,next)=>{
    if(!ctx.session.token)
        return ctx.render('redirectLogin')
    var res=await request({uri:proxyHost+ctx.path+"?token=000002"+ctx.session.token,
        method:'PUT',body:JSON.stringify(await parse.json(ctx))})
    ctx.body=res.body
    await next();
})

router.del('/',async (ctx,next)=>{
    ctx.session=null
    ctx.body={result:200}
    await next();
})

router.get('/test',async (ctx,next)=>{
    ctx.render('room',{
        user:{"nuc_uno":{"uin":"89397247","group":["member"],"permission":null,"game":0,"win":0,"level":0},"nuc_base":{"uin":"89397247","group":["member"],"permission":null,"account":"逗逗逗比逗","email":null,"tel":"15675131613","pass":"842697135"}},
        without_footer:1,
        title:"BBB - uno大厅",
        room_name:"测试房间2",
        room_time:new Date().getTime(),
        default_face:"/static/img/default_face.jpg",
        title_img:"/static/img/login_title_img.jpg",
        slides:[
            {img:"/static/img/bg1.jpg"},
            {img:"/static/img/bg2.jpg"},
            {img:"/static/img/bg3.jpg"}
        ]
    })
    await next();
})

export {router}