/**
 * Created by stitchcula on 2016/4/11.
 */

import Koa from 'koa'
import Router from 'koa-router'
import session from 'koa-session-redis'
import mongo from 'koa-mongo'
import convert from 'koa-convert'
import serve from 'koa-static'
import jade from 'jade'

var redis=require('co-redis')((()=>{
    var _=require('redis').createClient(
        process.env['REDIS_PORT'],
        process.env['REDIS_HOST']);
    _.auth(process.env['REDIS_AUTH']);
    return _
})())

const router=new Router()
var routes=require('dir-requirer')(__dirname)('./routes')
for(var r in routes){
    router.use('/'+r,routes[r].router.routes())
}

const app=new Koa()
app.proxy='nginx'
app.keys=['stcula','toy']
app.use(async (ctx,next)=>{
    console.log(ctx.ip+" "+ctx.method+" "+ctx.path+" at "+new Date().toLocaleString())
    ctx.redis=redis
    ctx.render=function(file,opt){
        return ctx.body=jade.renderFile(__dirname+'/dynamic/'+file+'.jade',opt,undefined)
    }
    try{
        await next()
    }catch(err){
        console.error(err)
        if(typeof(err)=='string'&&err.length==3)
            ctx.body=err
        else if(typeof(err)=='number'&&err.length==3)
            ctx.status=err
        else
            ctx.body="500"
    }
})

app.use(convert(mongo({
    host:process.env['MONGO_HOST']||'localhost',
    port:process.env['MONGO_PORT']||27017,
    //user:process.env['MONGO_USER']||"root",
    //pass:process.env['MONGO_PWD']||"",
    db:"uno_room"
})))

app.use(convert(session({store:{host:process.env.REDIS_HOST,port:process.env.REDIS_PORT,ttl:3600*6,auth:process.env.REDIS_AUTH}})))
app.use(convert(serve(__dirname + '/dynamic')))
app.use(convert(serve(__dirname)))
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(8008)