<?php

namespace App\Services;

@error_reporting(E_ALL & ~E_NOTICE);

use App\Models\User;
use App\Models\WebSocket;
use App\Models\WebSocketDialogMsg;
use App\Module\Base;
use App\Tasks\PushTask;
use Cache;
use Hhxsv5\LaravelS\Swoole\WebSocketHandlerInterface;
use Swoole\Http\Request;
use Swoole\WebSocket\Frame;
use Swoole\WebSocket\Server;

/**
 * @see https://wiki.swoole.com/#/start/start_ws_server
 */
class WebSocketService implements WebSocketHandlerInterface
{
    /**
     * 声明没有参数的构造函数
     * WebSocketService constructor.
     */
    public function __construct()
    {

    }

    /**
     * 连接建立时触发
     * @param Server $server
     * @param Request $request
     */
    public function onOpen(Server $server, Request $request)
    {
        global $_A;
        $_A = [
            '__static_langdata' => [],
        ];
        $fd = $request->fd;
        $data = Base::newTrim($request->get);
        $action = $data['action'];
        switch ($action) {
            /**
             * 网页访问
             */
            case 'web':
                {
                    // 判断token参数
                    $token = $data['token'];
                    $cacheKey = "ws::token:" . md5($token);
                    $userid = Cache::remember($cacheKey, now()->addSeconds(1), function () use ($token) {
                        $authInfo = User::authFind('all', $token);
                        if ($authInfo['userid'] > 0) {
                            if (User::whereUserid($authInfo['userid'])->whereEmail($authInfo['email'])->whereEncrypt($authInfo['encrypt'])->exists()) {
                                return $authInfo['userid'];
                            }
                        }
                        return 0;
                    });
                    if (empty($userid)) {
                        Cache::forget($cacheKey);
                        $server->push($fd, Base::array2json([
                            'type' => 'error',
                            'data' => [
                                'error' => '会员不存在'
                            ],
                        ]));
                        $server->close($fd);
                        $this->deleteUser($fd);
                        return;
                    }
                    // 保存用户、发送open事件
                    $this->saveUser($fd, $userid);
                    $server->push($fd, Base::array2json([
                        'type' => 'open',
                        'data' => [
                            'fd' => $fd,
                        ],
                    ]));
                    // 重试发送失败的消息
                    PushTask::resendTmpMsgForUserid($userid);
                }
                break;

            default:
                break;
        }
    }

    /**
     * 收到消息时触发
     * @param Server $server
     * @param Frame $frame
     */
    public function onMessage(Server $server, Frame $frame)
    {
        global $_A;
        $_A = [
            '__static_langdata' => [],
        ];
        //
        $msg = Base::json2array($frame->data);
        $type = $msg['type'];       // 消息类型
        $msgId = $msg['msgId'];     // 消息ID（用于回调）
        $data = $msg['data'];       // 消息详情
        //
        $reData = [];
        switch ($type) {
            /**
             * 收到回执
             */
            case 'receipt':
                $dialogMsg = WebSocketDialogMsg::whereId(intval($msgId))->first();
                $dialogMsg && $dialogMsg->sendSuccess();
                return;
        }
        //
        if ($msgId) {
            PushTask::push([
                'fd' => $frame->fd,
                'msg' => [
                    'type' => 'receipt',
                    'msgId' => $msgId,
                    'data' => $reData,
                ]
            ]);
        }
    }

    /**
     * 关闭连接时触发
     * @param Server $server
     * @param $fd
     * @param $reactorId
     * @throws \Exception
     */
    public function onClose(Server $server, $fd, $reactorId)
    {
        $this->deleteUser($fd);
    }

    /** ****************************************************************************** */
    /** ****************************************************************************** */
    /** ****************************************************************************** */

    /**
     * 保存用户
     * @param $fd
     * @param $userid
     */
    private function saveUser($fd, $userid)
    {
        WebSocket::updateInsert([
            'key' => md5($fd . '@' . $userid)
        ], [
            'fd' => $fd,
            'userid' => $userid,
        ]);
    }

    /**
     * 清除用户
     * @param $fd
     */
    private function deleteUser($fd)
    {
        WebSocket::whereFd($fd)->delete();
    }
}