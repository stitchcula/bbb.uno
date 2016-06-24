"use strict"

import Router from 'koa-router'
import request from 'co-request'
import parse from 'co-body'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.post('/signup',async (ctx,next)=>{
    var res=await request({uri:proxyHost+ctx.path+"?project=000002",
        method:"POST",body:JSON.stringify(await parse.json(ctx))})
    res.body=JSON.parse(res.body)
    if(res.body.result==200){
        var res2=await request({uri:proxyHost+"/user/oauth?project=000002&uin="+res.body.uin+"&token="+res.body.token,
            method:"POST"})
        res2.body=JSON.parse(res2.body)
        if(res2.body.result==200)
            ctx.body=res.body
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
    var res=await request({uri:proxyHost+ctx.path+"?project=000002",
        method:"POST",body:JSON.stringify(await parse.json(ctx))})
    ctx.body=res.body
    await next();
})

router.get('/',async ctx=>{
    var res=await request({uri:proxyHost+ctx.path+"?"+ctx.querystring,method:'GET'})
    ctx.body=res.body
})

router.put('/',async ctx=>{
    var res=await request({uri:proxyHost+ctx.path+"?"+ctx.querystring,
        method:'PUT',body:JSON.stringify(await parse.json(ctx))})
    ctx.body=res.body
})

export {router}