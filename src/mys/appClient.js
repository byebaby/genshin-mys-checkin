const {v4} = require('uuid');
const {_log, _warn, _err} = require('../utils/log');
const _ = require('lodash');
const {get, post} = require('axios').default;
const appds = require('./ds').appds;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class MysAppClient {
    constructor(appCookie, missionAppCookie) {
        this.app_headers = {
            'x-rpc-device_id': v4(),
            'x-rpc-client_type': '2',
            'x-rpc-app_version': '2.3.0',
            'user-agent': 'okhttp/4.8.0',
            referer: `https://app.mihoyo.com`,
            cookie: appCookie,
        };
        this.mission_headers = {
            Host: 'api-takumi.mihoyo.com',
            Origin: 'https://webstatic.mihoyo.com',
            'user-agent': 'Mozilla/5.0 (Linux; Android 5.1.1; VOG-AL00 Build/LMY48Z; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.100 Mobile Safari/537.36 miHoYoBBS/2.3.0',
            referer: `https://webstatic.mihoyo.com/app/community-shop/index.html?bbs_presentation_style=no_header`,
            cookie: missionAppCookie,
        };
    }


    continuous_sign() {
        post(
            `https://api-takumi.mihoyo.com/apihub/sapi/signIn`,
            {"gids": "2"},
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app签到请求失败', e.toString());
        })
    }

    view_post_0(post_id) {
        get(
            `https://api-takumi.mihoyo.com/post/api/getPostFull?post_id=${post_id}`,
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app查看文章失败', e.toString());
        })
    }

    post_up_0(post_id) {
        post(
            'https://api-takumi.mihoyo.com/apihub/sapi/upvotePost',
            {is_cancel: false, post_id: post_id},
            {headers: {...this.app_headers, ds: appds()}},
        ).catch(e => {
            global.failed = true;
            _err('app点赞文章失败', e.toString());
        })
    }

    share_post_0(post_id) {
        get(
            `https://api-takumi.mihoyo.com/apihub/api/getShareConf?entity_id=${post_id}&entity_type=1`,
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app分享文章失败', e.toString());
        })
    }

    appMybCheckin() {
        (async () => {
            await get(`https://bbs-api.mihoyo.com/post/api/feeds/posts?fresh_action=1&gids=2&last_id=`, {
                headers: this.app_headers,
            }).then(async ({data}) => {
                const list = _.get(data, 'data.list');
                let post_id_list = _.map(list, obj => {
                    return _.get(obj, 'post.post_id');
                });
                for (let post_id of post_id_list.slice(0, 1)) {
                    await delay(1000);
                    this.continuous_sign(post_id)
                }
                for (let post_id of post_id_list.slice(0, 3)) {
                    await delay(1000);
                    this.view_post_0(post_id)
                }
                for (let post_id of post_id_list.slice(0, 5)) {
                    await delay(1000);
                    this.post_up_0(post_id)
                }
                for (let post_id of post_id_list.slice(0, 1)) {
                    await delay(1000);
                    this.share_post_0(post_id)
                }
                _log("米游币获取完成,如有配置missionCookie将请求任务校验接口");
            }).catch(e => {
                global.failed = true;
                _err('米游币获取请求失败', e.toString());
            });
            await delay(1000);
            if (this.mission_headers.cookie != null) {
                _log("访问任务校验接口...");
                get('https://api-takumi.mihoyo.com/apihub/wapi/getUserMissionsState?point_sn=myb', {
                    headers: this.mission_headers,
                }).then(data => {
                    if (_.get(data, 'data.data.already_received_points') === 110) {
                        _log("米游币校验成功");
                    } else {
                        global.failed = true;
                        _err('米游币校验失败', data.toString());
                    }
                }).catch(e => {
                    global.failed = true;
                    _err('米游币校验失败', e.toString());
                })
            }
        })()

    }


}