import { Controller, type OnInit, type OnTick } from "@flamework/core";
import { Lighting } from "@rbxts/services";
import { TweenInfoBuilder } from "@rbxts/builders";
import CameraShaker, { CameraShakeInstance } from "@rbxts/camera-shaker";

import { Events } from "client/network";
import { tween } from "shared/utility/ui";

import type { CameraController } from "./camera";

const LENGTH = 8;
const DRUNK_SHAKE = new CameraShakeInstance(0.4, 0.6, 1, 1);
DRUNK_SHAKE.PositionInfluence = Vector3.zAxis.mul(0.5);
DRUNK_SHAKE.RotationInfluence = new Vector3(2, 1, 4);

const BLUR_SIZE_MIN = 6;
const BLUR_SIZE_MAX = 12;
const BLUR_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(1.5)
  .SetEasingStyle(Enum.EasingStyle.Sine)
  .SetEasingDirection(Enum.EasingDirection.Out)
  .SetReverses(true)
  .SetRepeatCount(math.huge)
  .Build();

@Controller()
export class DrunkController implements OnInit, OnTick {
  private readonly blur = new Instance("BlurEffect", Lighting);
  private readonly shaker = new CameraShaker(Enum.RenderPriority.Camera.Value, shakeCFrame => {
    const camera = this.camera.get("Default");
    camera.setCFrame(camera.instance.CFrame.mul(shakeCFrame));
  });

  private elapsedDrunkTime = 0;
  private isDrunk = false;
  private blurTween?: Tween;

  public constructor(
    private readonly camera: CameraController
  ) { }

  public onInit(): void {
    Events.drunkify.connect(() => this.drunkify());
    this.blur.Size = 0;
    this.shaker.Start();
  }

  public onTick(dt: number): void {
    if (!this.isDrunk) {
      this.elapsedDrunkTime = 0;
      return;
    }
    this.elapsedDrunkTime += dt / 2;
    if (this.elapsedDrunkTime >= LENGTH) {
      this.isDrunk = false;
      this.shaker.StopSustained(0.5);
      this.blurTween?.Cancel();
      this.blurTween = undefined;
      tween(this.blur, new TweenInfo(1.5), { Size: 0 })
    }
  }

  private drunkify(): void {
    if (this.isDrunk) {
      this.elapsedDrunkTime -= LENGTH;
      return;
    }
    this.isDrunk = true;

    this.shaker.ShakeSustain(DRUNK_SHAKE);
    this.blur.Size = BLUR_SIZE_MIN;
    this.blurTween = tween(this.blur, BLUR_TWEEN_INFO, { Size: BLUR_SIZE_MAX });
  }
}