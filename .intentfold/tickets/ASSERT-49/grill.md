# ASSERT-49 Grill

## 你的决定

1. **自动开单由谁触发。** 推荐过：owner 的 Mac 每个工作日早上跑一次 `oas-error`。owner：“我希望侦测到该建工单的错误，直接就建工单，不是让我定时建工单”。
1a. **侦测放在哪里。** 推荐过：Mac 上每 10 分钟轮询并启动 agent，理由是不必在 AssertChecks 存密钥、不改红线。owner：“什么鸡巴红线，红线是怕你乱改，不是怕我乱改，必须服务器上来做这件事，尽最大可能不让我的mac替服务器工作，别的这类平台，接入第三方的系统，需要密钥等就申请呗，所以我们也是”。结论：服务器侦测、解读、开单、发 Slack，密钥在页面接入；按原话修改 Charter 相关条目。
4. **Slack 用 incoming webhook。** owner 问“有没有更简单的方式，比如什么webhook?”，并提供了测试频道的 webhook。
15. **工单去向在页面填写：平台、项目、负责人，Plane 和 Linear 都支持，能下拉就下拉。**（owner 原话：“项目和责任人的名字能拉最好，不能下拉，应该支持模糊的”）服务器接入密钥后可以列出项目和成员，所以做下拉。

16a. **验收开单的地方。** owner：“用我的linear key吧，写吧，项目是 benefits-finder, 给qingyang wang”，随后改为“等，你先测试nsdk的发单，是narrative-sdk项目”“都放到ENG这个team下”。NSDK 的 6 张单开在 narrative-sdk（ENG），未指定负责人，指派给 owner 本人。
18a. **解读模型。** owner：“用luna-high模型”，即 `gpt-5.6-luna`，reasoning effort high。
22. **授权。** owner：“我授权你auto权限，你做”。据此授予 owner 账号和 Container App 托管身份在 `finley-codex` 上的 Cognitive Services OpenAI User，并保存 owner 的 Linear、Plane 密钥到 nsdk、sandbox 的设置里。

## 替你决定的

2. **验收用的 Plane 项目。** 在 intentmill 工作区新建 “AssertChecks Sandbox”，sandbox 的工单开在那里。依据：sandbox 读的是 BF 真实报错，不能写进 BF 的工单系统，也不该混进 assertchecks 的真实工单；owner 要求“只让我做我不得不做的”。
3. **网页手动挂单也发 Slack。** 依据：owner 说的是“创建好工单后，把工单发送到这个 channel 上”，没有区分来源。
5. **Slack 消息只用 AssertChecks 自己的数据**：问题名、最近一次错误消息、位置、7 天次数、首次出现、工单链接、打开该问题的链接。解读只在工单里。
6. **一次挂单发一条消息**；已经挂过的不再发。
7. **Slack 发送失败不重试、不回滚挂单**，原因返回给挂单的人（自动开单则记在开单记录里）。
8. **“需要工单”的口径和页面 Needs a ticket 卡片一样**（无工单、未标 Not handling、7 天内出现过或新问题），只取报错，挪到服务端共用。
9. **项目的任何成员都能修改自动开单设置。** 依据：网页没有角色，成员都能挂单和标 Not handling。
11. **工单里的解读标明是自动解读，不是已确认的根因。** 依据：服务器只看到错误消息和堆栈，读不到项目代码。
12. **加 `?tab=errors&problem=<id>`，打开时展开该问题。**
14. **自动开单按项目配置开启，本单只给 sandbox 配置。** 依据：一配置，现有的 needs a ticket 报错会立刻全部开单（nsdk 约 10 个、bf 约 7 个），这是往真实工单系统写入，由 owner 决定何时给 nsdk、bf 配置。
16. **定时器只在 Azure Container App 里运行**（生产构建且有 `CONTAINER_APP_NAME`），每 10 分钟一次，advisory lock 防并发。依据：本地与生产共用数据库，开发机不能往真实平台开单。
17. **先认领再开单，失败记原因，配置改动后才重试失败的问题。** 依据：平台的创建不是幂等的，重试会开出重复工单；配置不变时重试只会重复失败。
18. **解读用 Azure OpenAI `finley-codex` 资源上的部署，托管身份调用，不存密钥。** 需要给 Container App 身份授予 Cognitive Services OpenAI User；本地用开发者的 `az login`。依据：AssertChecks 已用同一身份读遥测，不新增密钥。
19. **平台密钥存在数据库，页面和接口从不回显。** 依据：和 owner 说的“需要密钥等就申请呗”一致；明文存库意味着能读库的人能拿到密钥，数据库只有运维和本机开发能连。
20. **工单语言：Linear 英文，Plane 中文。** 依据：owner 现有两个平台的惯例。
21. **错误消息和堆栈会发给 Azure OpenAI（公司自己的租户，瑞典中部）并写进工单。** 依据：这些内容已在项目自己的 Application Insights 里；如果其中含个人数据，处理范围也仅限公司自己的系统。
23. **解读失败就不开单，下一轮重试。**（验收中改定，替代第 7 条里“解读失败照样开单”的做法）依据：验收时 Azure 授权尚未完全生效，8 张 Plane 单开成了没有解读的单，且之后不会补；owner 要求工单携带解读。
24. **每轮先验证一次平台密钥。** 依据：密钥失效时不必为每个问题先调用模型。
25. **Linear 项目属于多个 team 时按 team 分别列出。** 依据：narrative-sdk 同时属于 BUG、PRO、ENG，issue 只能属于一个 team。
