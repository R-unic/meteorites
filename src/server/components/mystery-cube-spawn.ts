import type { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { TweenInfoBuilder } from "@rbxts/builders";
import PartCacheModule from "@rbxts/partcache";

import { Assets } from "shared/utility/instances";
import { randomVector3 } from "shared/utility/3D";
import { tween } from "shared/utility/ui";

import type { SchedulingService } from "server/services/scheduling";

const SPAWN_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(0.4)
  .SetEasingStyle(Enum.EasingStyle.Elastic);

interface Attributes {
  readonly MysteryCubeSpawn_Rate: number;
}

@Component({ tag: "MysteryCubeSpawn" })
export class MysteryCubeSpawn extends BaseComponent<Attributes, Part> implements OnStart {
  public static readonly cache = new PartCacheModule(Assets.Cube, 15);

  public constructor(
    private readonly scheduling: SchedulingService
  ) { super(); }

  public onStart(): void {
    this.scheduling.runForever(() => {
      while (task.wait(this.attributes.MysteryCubeSpawn_Rate))
        task.spawn(() => this.spawnCube());
    });
  }

  private getSpawnLocation(): Vector3 {
    const offset = new Vector3(this.instance.Size.X / 2, 0, this.instance.Size.Z / 2);
    const min = this.instance.Position.sub(offset);
    const max = this.instance.Position.add(offset);
    return randomVector3(min, max)
      .add(Vector3.yAxis.mul(Assets.Cube.Size.Y / 2));
  }

  private spawnCube(): void {
    const position = this.getSpawnLocation();
    const cube = MysteryCubeSpawn.cache.GetPart();
    cube.Size = Vector3.zero;
    cube.Position = position;
    tween(cube, SPAWN_TWEEN_INFO, { Size: Assets.Cube.Size })
      .Completed.Once(() => cube.AddTag("MysteryCube"));
  }
}