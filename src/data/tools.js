import { Circle, Flower2, Leaf, Lightbulb, Moon, Mountain, Route, Sparkles, Sprout, Sun, Waves, Wind } from 'lucide-react';

export const tools = [
  tool('wind', '风', '一点风', Wind, '在天空里画一条会走的线。', '风把花园轻轻带动。', '#8EC5E8'),
  tool('rain', '雨', '一点雨', Waves, '点一点，落下一些雨。', '雨点落下来了。', '#8EC5E8'),
  tool('grass', '草', '一点草', Leaf, '从土地边缘画几根小线。', '一点绿色长出来了。', '#9ED8C3'),
  tool('flower', '花', '一朵花', Flower2, '围着一个小点画几片花瓣。', '花开了一点点。', '#F5A8C8'),
  tool('sun', '光', '一束光', Sun, '从光点向外画几条线。', '一点光落下来了。', '#F7C948'),
  tool('seed', '种子', '种子', Sprout, '点一点，放下一颗小种子。', '种子被轻轻放下。', '#9ED8C3'),
  tool('sunlight', '晨光', '晨光', Sun, '画放射线，让光落下来。', '晨光落在花园里。', '#F7C948'),
  tool('dew', '雨水', '雨水', Sparkles, '画一点雨线，给花园一点水。', '雨水落下来了。', '#8EC5E8'),
  tool('soilLine', '土纹', '土纹', Route, '画柔和横线，让土地更松软。', '土地多了柔和纹理。', '#BFA37A'),
  tool('firstFlower', '小花', '小花', Flower2, '画一个小圆，打开第一朵花。', '第一朵小花打开。', '#F5A8C8'),
  tool('waterLine', '水线', '水线', Waves, '沿着小溪画长线。', '小溪流动了一点。', '#8EC5E8'),
  tool('ripple', '涟漪', '涟漪', Circle, '画小圆，水面会扩散。', '水面扩出涟漪。', '#8EC5E8'),
  tool('leafBoat', '叶舟', '叶舟', Leaf, '画短弧线，让叶子顺水漂。', '叶舟慢慢漂走。', '#9ED8C3'),
  tool('bridge', '小桥', '小桥', Route, '画横线，桥板会连起来。', '小桥更完整了一点。', '#BFA37A'),
  tool('rainDrop', '雨滴', '雨滴', Waves, '点点或短竖线，给花园一点雨。', '雨滴让地面更湿润。', '#8EC5E8'),
  tool('reed', '芦苇', '芦苇', Leaf, '在岸边画竖线。', '岸边长出芦苇。', '#9ED8C3'),
  tool('windLine', '风线', '风线', Wind, '画弯弯的线，草坡会跟着动。', '草坡跟着风动起来。', '#8EC5E8'),
  tool('cloud', '云团', '云团', Sparkles, '画大弧线，让云慢慢漂。', '云团慢慢飘过。', '#C8DDED'),
  tool('floatingLeaf', '飘叶', '飘叶', Leaf, '画短弧线，让叶片顺风走。', '叶片顺着风走。', '#9ED8C3'),
  tool('windBell', '风铃', '风铃', Sparkles, '画竖线和小点，挂起风铃。', '风铃轻轻摆动。', '#F7C948'),
  tool('ribbon', '彩带', '彩带', Sparkles, '画长弧线，让彩带飘起来。', '彩带慢慢飘动。', '#F5A8C8'),
  tool('stone', '石头', '石头', Mountain, '点出圆圆石头，把路连起来。', '石头把小路接上一点。', '#BFA37A'),
  tool('moss', '苔藓', '苔藓', Leaf, '点很多小点，让石边变柔和。', '苔藓让石头边缘变柔。', '#9ED8C3'),
  tool('smallTree', '小树', '小树', Sprout, '画竖线和分叉。', '小树在路边站起来。', '#9ED8C3'),
  tool('shadow', '柔影', '柔影', Moon, '画轻轻的横线，留下一片安静角落。', '地面多了一片柔影。', '#A88BE8'),
  tool('breathLight', '慢光', '慢光', Lightbulb, '画圆圈或小点，让光慢慢亮。', '慢光一呼一吸。', '#F7C948'),
  tool('signpost', '路牌', '路牌', Route, '画竖线和横线，给小路一个方向。', '小路有了路牌。', '#BFA37A'),
  tool('mushroom', '蘑菇', '蘑菇', Sprout, '画半圆和短竖线，蘑菇会冒出来。', '蘑菇从土里冒出。', '#F5A8C8'),
  tool('sprout', '嫩芽', '嫩芽', Sprout, '向上画短线，让芽长高。', '嫩芽长高了一点。', '#9ED8C3'),
  tool('puddle', '水洼', '水洼', Waves, '画椭圆，水面会亮一下。', '水洼亮了一下。', '#8EC5E8'),
  tool('snail', '??', '??', Sparkles, '?????????????????', '??????????', '#BFA37A'),
  tool('snailTrail', '??', '??', Sparkles, '?????????????????', '??????????', '#BFA37A'),
  tool('bud', '花苞', '花苞', Flower2, '点小圆点，花苞会出现。', '花苞安静地出现。', '#F5A8C8'),
  tool('lantern', '灯笼', '灯笼', Lightbulb, '画小圆或竖线，挂起暖灯。', '灯笼亮了一点。', '#F7C948'),
  tool('firefly', '萤火', '萤火', Sparkles, '点一点，让小光飞起来。', '萤火在花园里飞。', '#F7C948'),
  tool('moon', '月亮', '月亮', Moon, '画一条弧线，月亮会出来。', '月亮升起来。', '#F7C948'),
  tool('windowLight', '窗光', '窗光', Lightbulb, '画小方块或点，让远处窗户亮起。', '远处窗光亮起。', '#F7C948'),
  tool('quietFlower', '夜花', '夜花', Flower2, '画小弧线，夜里的花会打开。', '夜花轻轻打开。', '#F5A8C8'),
  tool('softWind', '轻风', '轻风', Wind, '慢慢画弯线，灯光轻轻摆。', '轻风经过灯园。', '#8EC5E8'),
  tool('star', '星星', '星星', Sparkles, '点一点或画小叉，星星会亮。', '星星亮起来。', '#F7C948'),
  tool('moonbeam', '月光', '月光', Moon, '画斜线，让月光照进温室。', '月光照进温室。', '#F7C948'),
  tool('memorySeed', '记忆种子', '记忆种子', Sprout, '点亮前几天的小物件。', '一周小物件亮了一点。', '#9ED8C3'),
  tool('constellationLine', '星座线', '星座线', Sparkles, '连线，让一周的小光连接。', '星星连成一条线。', '#A88BE8'),
  tool('rainbow', '淡彩虹', '淡彩虹', Sparkles, '画长弧线，给温室收起一层颜色。', '淡淡的彩虹出现了。', '#F5A8C8'),
];

export const emptyElements = Object.fromEntries(tools.map((item) => [item.id, 0]));

export function getTool(toolId) {
  return tools.find((item) => item.id === toolId) || tools[0];
}

function tool(id, name, label, icon, prompt, feedback, color) {
  return { id, name, label, icon, prompt, feedback, color };
}
