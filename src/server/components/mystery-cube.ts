import type { OnStart } from "@flamework/core";
import { Component } from "@flamework/components";
import { Workspace as World } from "@rbxts/services";
import { TweenInfoBuilder } from "@rbxts/builders";

import DestroyableComponent from "shared/base-components/destroyable";
import { MysteryCubeSpawn } from "./mystery-cube-spawn";
import { tween } from "shared/utility/ui";
import { Assets, getChildrenOfType } from "shared/utility/instances";
import { randomElement } from "shared/utility/array";
import { Events } from "server/network";

const DEFAULT_SIZE = Assets.Cube.Size;
const EXPLODE_TWEEN_INFO = new TweenInfoBuilder()
  .SetTime(0.5)
  .SetEasingStyle(Enum.EasingStyle.Elastic)
  .SetEasingDirection(Enum.EasingDirection.In);

interface MysteryCubeModel extends MeshPart {
  Explosion: ParticleEmitter;
  Sparkles: ParticleEmitter;
}

@Component({
  tag: "MysteryCube",
  ancestorWhitelist: [World]
})
export class MysteryCube extends DestroyableComponent<{}, MysteryCubeModel> implements OnStart {
  public onStart(): void {
    this.janitor.Add(() => {
      MysteryCubeSpawn.cache.ReturnPart(this.instance);
      this.instance.RemoveTag("MysteryCube");
    });

    const proximityPrompt = this.janitor.Add(new Instance("ProximityPrompt"));
    proximityPrompt.ActionText = "Interact";
    proximityPrompt.Parent = this.instance;
    this.janitor.Add(proximityPrompt.Triggered.Connect(player => {
      const action = math.random(1, 3);
      switch (action) {
        case 1: return this.explode(player);
        case 2: return this.giveItem(player);
        case 3: return this.drunkify(player);
      }
    }));
  }

  private explode(player: Player): void {
    const goalSize = DEFAULT_SIZE.mul(1.5);
    const difference = DEFAULT_SIZE.Y - goalSize.Y;
    const goalPosition = this.instance.Position.add(Vector3.yAxis.mul(difference / 2));
    const character = <CharacterModel>player.Character;
    this.instance.FindFirstChildOfClass("ProximityPrompt")?.Destroy();

    tween(this.instance, EXPLODE_TWEEN_INFO, {
      Size: goalSize,
      Position: goalPosition
    }).Completed.Once(() => {
      const explosion = this.instance.Explosion.Clone();
      this.destroy();
      character.Humanoid.TakeDamage(50);

      const particleContainer = this.createParticleContainer(goalPosition);
      explosion.Parent = particleContainer;
      explosion.Emit(3);
      task.delay(explosion.Lifetime.Max, () => particleContainer.Destroy());
    });
  }

  private giveItem(player: Player): void {
    const item = randomElement(getChildrenOfType(Assets.Items, "Tool")).Clone();
    item.Parent = player.WaitForChild("Backpack");

    const position = this.instance.Position;
    const sparkles = this.instance.Sparkles.Clone();
    this.destroy();

    const particleContainer = this.createParticleContainer(position.sub(Vector3.yAxis.mul(DEFAULT_SIZE.Y)));
    sparkles.Parent = particleContainer;
    sparkles.Enabled = true;
    task.delay(2, () => {
      sparkles.Enabled = false;
      task.delay(sparkles.Lifetime.Max, () => particleContainer.Destroy());
    });
  }

  private drunkify(player: Player): void {
    Events.drunkify(player);
    this.destroy();
  }

  private createParticleContainer(position: Vector3): Part {
    const particleContainer = new Instance("Part");
    particleContainer.Anchored = true;
    particleContainer.CanCollide = false;
    particleContainer.Transparency = 1;
    particleContainer.Size = DEFAULT_SIZE;
    particleContainer.Position = position;
    particleContainer.Parent = World;
    return particleContainer;
  }
}