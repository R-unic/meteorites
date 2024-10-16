import type { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { Workspace as World, CollectionService as Collection, InsertService as Insert } from "@rbxts/services";
import { RaycastParamsBuilder, TweenInfoBuilder } from "@rbxts/builders";
import PartCacheModule from "@rbxts/partcache";

import { Assets } from "shared/utility/instances";
import { randomVector3 } from "shared/utility/3D";
import { tween } from "shared/utility/ui";
import Log from "shared/logger";

import type { SchedulingService } from "server/services/scheduling";

const CACHE = new PartCacheModule(Assets.Meteorite, 15);
const GROUND_CHECK_DISTANCE = 1000;
const INDICATOR_HEIGHT = 0.2;
const INDICATOR_SIZE_MIN = new Vector3(4, INDICATOR_HEIGHT, 4);
const INDICATOR_SIZE_MAX = new Vector3(12, INDICATOR_HEIGHT, 12);
const INDICATOR_FADE_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(1)
  .Build();
const INDICATOR_GROW_LENGTH = 1.5;
const INDICATOR_GROW_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(INDICATOR_GROW_LENGTH)
  .Build();
const FALL_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(1)
  .SetEasingStyle(Enum.EasingStyle.Quart)
  .SetEasingDirection(Enum.EasingDirection.In)
  .Build();

interface MeteoriteSpawnLocation {
  readonly origin: Vector3;
  readonly destination: Vector3;
}

interface Attributes {
  readonly MeteoriteSpawn_Rate: number;
}

@Component({ tag: "MeteoriteSpawn" })
export class MeteoriteSpawn extends BaseComponent<Attributes, Part> implements OnStart {
  public constructor(
    private readonly scheduling: SchedulingService
  ) { super(); }

  public onStart(): void {
    this.scheduling.runForever(() => {
      while (task.wait(this.attributes.MeteoriteSpawn_Rate))
        task.spawn(() => this.spawnMeteorite());
    });
  }

  private getSpawnLocation(): MeteoriteSpawnLocation {
    const offset = new Vector3(this.instance.Size.X / 2, 0, this.instance.Size.Z / 2);
    const min = this.instance.Position.sub(offset);
    const max = this.instance.Position.add(offset);
    const origin = randomVector3(min, max)
      .add(Vector3.yAxis.mul(this.instance.Size.Y / 2));

    const raycastParams = new RaycastParamsBuilder()
      .AddToFilter(...<Part[]>Collection.GetTagged("Ground"))
      .AddToFilter(...<Part[]>Collection.GetTagged("Obstacle"))
      .SetIgnoreWater(true)
      .Build();

    raycastParams.FilterType = Enum.RaycastFilterType.Include;
    const raycastResult = World.Blockcast(new CFrame(origin), Assets.Meteorite.Size, new Vector3(0, -GROUND_CHECK_DISTANCE, 0), raycastParams);
    if (raycastResult === undefined)
      throw Log.fatal("Failed to calculate meteorite spawn location: No parts were detected under meteorite");

    if (raycastResult.Instance.HasTag("Obstacle"))
      return this.getSpawnLocation();

    const destination = raycastResult.Position;
    return { origin, destination };
  }

  private spawnMeteorite(): void {
    const { origin, destination } = this.getSpawnLocation();
    const indicator = Insert.CreateMeshPartAsync("rbxassetid://16335287220", "Box", "Automatic"); // good cylinder
    indicator.Anchored = true;
    indicator.CanCollide = false
    indicator.Transparency = 0.6;
    indicator.BrickColor = new BrickColor("Bright red");
    indicator.Size = INDICATOR_SIZE_MIN;
    indicator.Position = destination.add(Vector3.yAxis.mul(INDICATOR_HEIGHT / 2));
    indicator.Parent = World;

    tween(indicator, INDICATOR_GROW_TWEEN_INFO, { Size: INDICATOR_SIZE_MAX })
      .Completed.Once(() => tween(indicator, INDICATOR_FADE_TWEEN_INFO, {
        Size: Vector3.zero,
        Transparency: 1
      }));

    task.delay(INDICATOR_GROW_LENGTH / 1.5, () => {
      const meteorite = CACHE.GetPart();
      meteorite.Position = origin;
      tween(meteorite, FALL_TWEEN_INFO, { Position: destination })
        .Completed.Once(() => CACHE.ReturnPart(meteorite));
    });
  }
}