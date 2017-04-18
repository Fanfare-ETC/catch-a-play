'use strict';
import * as PIXI from 'pixi.js';
import 'pixi-action';
import EventEmitter from 'eventemitter3';

import PlaybookEvents,
{
  FriendlyNames as PlaybookEventsFriendlyNames,
  Teams as PlaybookEventsTeams,
  StringMap as PlaybookEventsStringMap,
  IsOut as PlaybookEventsIsOut,
  IsOnBase as PlaybookEventsIsOnBase
} from './lib/PlaybookEvents';

// The Playbook Bridge is supplied via addJavaScriptInterface() on the Java
// side of the code. In the absence of that, we need to mock one.
if (!global.PlaybookBridge) {
  /** @type {Object<string, function>} */
  global.PlaybookBridge = {
    /**
     * Returns the URL of the WebSocket server.
     * @returns {string}
     */
    getAPIUrl: function () {
      return 'ws://localhost:9001';
    },

    /**
     * Returns the URL of the Section API server.
     * @returns {string}
     */
    getSectionAPIUrl: function () {
      return 'http://localhost:9002';
    },

    /**
     * Returns the ID of the current player.
     * This is stubbed.
     * @returns {string}
     */
    getPlayerID: function () {
      return 1;
    },

    /**
     * Notifies the hosting application of the new state of the game.
     * This is a no-op for the mock bridge.
     * @type {string} stateJSON
     */
    notifyGameState: function (stateJSON) {
      console.log('Saving state: ', stateJSON);
      localStorage.setItem('collection', stateJSON);
    },

    /**
     * Notifies the hosting application that we have finished loading.
     * This is a no-op for the mock bridge.
     */
    notifyLoaded: function () {
      let restoredState = localStorage.getItem('collection');
      if (restoredState === null) {
        restoredState = JSON.stringify({
          cardSlots: [
            { present: false, card: null },
            { present: false, card: null },
            { present: false, card: null },
            { present: false, card: null },
            { present: false, card: null }
          ],
          goal: null,
          score: 0,
          selectedGoal: null
        });
      }

      console.log('Loading state: ', restoredState);
      state.fromJSON(restoredState);
    }
  };
} else {
  // Receive messages from the hosting application.
  global.addEventListener('message', function (e) {
    const message = e.data;
    switch (message.action) {
      case 'RESTORE_GAME_STATE':
        console.log('Restoring state from hosting application: ');
        state.fromJSON(message.payload);
        break;
      case 'HANDLE_MESSAGE':
        console.log('Handling message from hosting application: ');
        handleIncomingMessage(message.payload);
        break;
    }
  });
}

const GoalTypes = {
  IDENTICAL_CARDS_3: "IDENTICAL_CARDS_3",
  IDENTICAL_CARDS_4: "IDENTICAL_CARDS_4",
  IDENTICAL_CARDS_5: "IDENTICAL_CARDS_5",
  UNIQUE_OUT_CARDS_3: "UNIQUE_OUT_CARDS_3",
  UNIQUE_OUT_CARDS_4: "UNIQUE_OUT_CARDS_4",
  WALK_OR_HIT_BY_PITCH_3: "WALK_OR_HIT_BY_PITCH_3",
  OUT_3: "OUT_3",
  BASES_RBI_3: "BASES_RBI_3",
  EACH_COLOR_1: "EACH_COLOR_1",
  EACH_COLOR_2: "EACH_COLOR_2",
  SAME_COLOR_3: "SAME_COLOR_3",
  SAME_COLOR_4: "SAME_COLOR_4",
  SAME_COLOR_5: "SAME_COLOR_5",
  BASE_STEAL_RBI: "BASE_STEAL_RBI",
  ON_BASE_STEAL_PICK_OFF: "ON_BASE_STEAL_PICK_OFF",
  FULL_HOUSE: "FULL_HOUSE",
  UNKNOWN: "UNKNOWN"
};
/*
const finder = function (goal) {
  return function (id) {
    return GoalTypesMetadata[goal].serverId === id;
  };
};
Object.keys(GoalTypesMetadata)
  .find(finder(15))

std::find_if()
*/
const GoalTypesMetadata = {
  [GoalTypes.IDENTICAL_CARDS_3]: {
    description: "3 IDENTICAL CARDS",
    file: "goal/goal1.png",
    score: 8,
    isHidden: true,
    serverId: 1
  },
  [GoalTypes.IDENTICAL_CARDS_4]: {
    description: "4 IDENTICAL CARDS",
    file: "goal/goal2.png",
    score: 12,
    isHidden: false,
    serverId: 9
  },
  [GoalTypes.UNIQUE_OUT_CARDS_4]: {
    description: "4 DIFFERENT OUT CARDS",
    file: "goal/goal3.png",
    score: 12,
    isHidden: false,
    serverId: 17
  },
  [GoalTypes.IDENTICAL_CARDS_5]: {
    description: "5 IDENTICAL CARDS",
    file: "goal/goal4.png",
    score: 20,
    isHidden: false,
    serverId: 13
  },
  [GoalTypes.WALK_OR_HIT_BY_PITCH_3]: {
    description: "3 OF WALK OR HIT BY PITCH",
    file: "goal/goal5.png",
    score: 8,
    isHidden: true,
    serverId: 4
  },
  [GoalTypes.OUT_3]: {
    description: "SET SHOWS 3 OUTS",
    file: "goal/goal6.png",
    score: 6,
    isHidden: false,
    serverId: 7
  },
  [GoalTypes.BASES_RBI_3]: {
    description: "SET SHOWS 3 BASES",
    file: "goal/goal7.png",
    score: 12,
    isHidden: false,
    serverId: 16
  },
  [GoalTypes.EACH_COLOR_2]: {
    description: "2 CARDS OF EACH COLOR",
    file: "goal/goal8.png",
    score: 12,
    isHidden: false,
    serverId: 12
  },
  [GoalTypes.SAME_COLOR_3]: {
    description: "3 CARDS OF SAME COLOR",
    file: "goal/goal9.png",
    score: 8,
    isHidden: true,
    serverId: 2
  },
  [GoalTypes.EACH_COLOR_1]: {
    description: "1 CARD OF EACH COLOR",
    file: "goal/goal11.png",
    score: 4,
    isHidden: true,
    serverId: 3
  },
  [GoalTypes.UNIQUE_OUT_CARDS_3]: {
    description: "3 DIFFERENT OUT CARDS",
    file: "goal/goal12.png",
    score: 8,
    isHidden: false,
    serverId: 8
  },
  [GoalTypes.SAME_COLOR_4]: {
    description: "4 CARDS OF SAME COLOR",
    file: "goal/goal13.png",
    score: 12,
    isHidden: false,
    serverId: 10
  },
  [GoalTypes.SAME_COLOR_5]: {
    description: "5 CARDS OF SAME COLOR",
    file: "goal/goal14.png",
    score: 20,
    isHidden: false,
    serverId: 14
  },
  [GoalTypes.BASE_STEAL_RBI]: {
    description: "BASE, STEAL & RBI",
    file: "goal/goal15.png",
    score: 8,
    isHidden: false,
    serverId: 11
  },
  [GoalTypes.ON_BASE_STEAL_PICK_OFF]: {
    description: "BASE, STEAL & PICK OFF",
    file: "",
    score: 8,
    isHidden: true,
    serverId: 5
  },
  [GoalTypes.FULL_HOUSE]: {
    description: "FULL HOUSE",
    file: "",
    score: 16,
    isHidden: true,
    serverId: 6
  }
};

class GameState {
  constructor() {
    this.EVENT_GOAL_CHANGED = 'goalChanged';
    this.EVENT_SCORE_CHANGED = 'scoreChanged';
    this.EVENT_SELECTED_GOAL_CHANGED = 'selectedGoalChanged';
    this.EVENT_CARDS_MATCHING_SELECTED_GOAL_CHANGED = 'cardsMatchingSelectedGoalChanged';

    /** @type {Card?} */
    this.activeCard = null;

    /** @type {boolean} */
    this.isCardActive = false;

    /** @type {string} */
    this._goal = null;

    /** @type {Array.<Card>} */
    this.cards = new Array();

    /** @type {Array.<Card>} */
    this.incomingCards = new Array();

    /** @type {Array.<CardSlot>} */
    this._cardSlots = new Array();

    /** @type {Object.<string, Array.<Card>>} */
    this.goalSets = {};

    /** @type {Array.<Card>?} */
    this._cardsMatchingSelectedGoal = null;

    /** @type {string?} */
    this._selectedGoal = null;

    /** @type {number} */
    this._score = 0;

    /** @type {EventEmitter} */
    this.emitter = new EventEmitter();
  }

  /**
   * @returns {string}
   */
  get goal() {
    return this._goal;
  }

  /**
   * @param {string} value
   */
  set goal(value) {
    const oldValue = this._goal;
    this._goal = value;
    console.log('goal->', value);
    this.emitter.emit(this.EVENT_GOAL_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * @returns {Array.<CardSlot>}
   */
  get cardSlots() {
    return this._cardSlots;
  }

  /**
   * @param {Array.<CardSlot>} value
   */
  set cardSlots(value) {
    const oldValue = this._cardSlots;
    this._cardSlots = value;
    console.log('cardSlots->', value);
    this.emitter.emit(this.EVENT_CARD_SLOTS_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * @returns {number}
   */
  get score() {
    return this._score;
  }

  /**
   * @param {number} value
   */
  set score(value) {
    const oldValue = this._score;
    this._score = value;
    console.log('score->', value);
    this.emitter.emit(this.EVENT_SCORE_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * @returns {string}
   */
  get selectedGoal() {
    return this._selectedGoal;
  }

  /**
   * @param {string} value
   */
  set selectedGoal(value) {
    const oldValue = this._selectedGoal;
    this._selectedGoal = value;
    console.log('selectedGoal->', value);
    this.emitter.emit(this.EVENT_SELECTED_GOAL_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * @returns {Array.<Card>}
   */
  get cardsMatchingSelectedGoal() {
    return this._cardsMatchingSelectedGoal;
  }

  /**
   * @param {Array.<Card>} value
   */
  set cardsMatchingSelectedGoal(value) {
    const oldValue = this._cardsMatchingSelectedGoal;
    this._cardsMatchingSelectedGoal = value;
    console.log('cardsMatchingSelectedGoal->', value);
    this.emitter.emit(this.EVENT_CARDS_MATCHING_SELECTED_GOAL_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * Returns the game state as JSON.
   * @returns {string}
   */
  toJSON() {
    // We need to remove the sprite because that can't be serialized.
    const cardSlots = this.cardSlots.map(slot => {
      return {
        present: slot.present,
        card: slot.present ? {
          isActive: slot.card.isActive,
          play: slot.card.play,
          team: slot.card.team
        } : null
      }
    });

    const savedState = {
      goal: this.goal,
      cardSlots: cardSlots,
      score: this.score,
      selectedGoal: this.selectedGoal,
      cardsMatchingSelectedGoal: this.cardsMatchingSelectedGoal ?
        this.cardsMatchingSelectedGoal.map(card => {
          return this.cardSlots.findIndex(slot => {
            return slot.card === card;
          });
        }) : null
    };

    return JSON.stringify(savedState);
  }

  /**
   * Restores the game state from JSON.
   * @param {string} state
   */
  fromJSON(state) {
    console.log('fromJSON', state);

    // Create empty card slots.
    for (let i = 0; i < 5; i++) {
      this.cardSlots[i] = new CardSlot();
    }

    const restoredState = JSON.parse(state);
    if (restoredState === null) {
      createRandomGoal();
    } else {
      restoredState.cardSlots.forEach((slot, index) => {
        this.cardSlots[index].present = slot.present;
        if (slot.present) {
          const card = createCard(slot.card.play, false, index);
          Object.assign(card, slot.card);
          initCardEvents(card);
          card.moveToSlot(index);
          this._cardSlots[index].card = card;
        }
      });
      this.goal = restoredState.goal;
      this.score = restoredState.score;

      // This comes before the latter.
      this.cardsMatchingSelectedGoal = restoredState.cardsMatchingSelectedGoal ?
        restoredState.cardsMatchingSelectedGoal.map(cardId => {
          return this.cardSlots[cardId].card;
        }) : null;
      this.selectedGoal = restoredState.selectedGoal;
    }
  }
}

const connection = new WebSocket(PlaybookBridge.getAPIUrl());
const renderer = PIXI.autoDetectRenderer(1080, 1920, { resolution: window.devicePixelRatio });
const stage = new PIXI.Container();
const state = new GameState();

// Content scale will be updated on first draw.
let contentScale = null;
//const _tray = new PIXI.Sprite(null);

/**
 * Card.
 */
class Card {
  /**
   * @param {string} team
   * @param {event} play
   * @param {PIXI.Sprite} card
   */
  constructor(team, play, card) {
    /** @type {string} */
    this.play = play;

    /** @type {string} */
    this.team = team;

    /** @type {PIXI.Sprite} */
    this.sprite = card;

    /** @type {bool} */
    this.isBeingDragged = false;

    /** @type {int?} */
    this.dragPointerId = null;

    /** @type {PIXI.Point?} */
    this.dragOffset = null;

    /** @type {PIXI.Point?} */
    this.dragOrigPosition = null;

    /** @type {number?} */
    this.dragOrigRotation = null;

    /** @type {number?} */
    this.dragOrigScale = null;

    /** @type {number} */
    this.dragTarget = -1; //card slot (0-4) discard (6) or score (7)

    /** @type {number} */
    this.isAnimating = false;

    /** @type {bool} */
    this.isActive = true;

    /** @type {FieldOverlayArea?} */
    this.selectedTarget = null; //only score
  }

  /**
   * Moves this card to a specific position in world space with animation.
   * @param {PIXI.Point} position
   * @return {PIXI.action.Sequence}
   */
  _moveToWithAnimation(position) {
    const moveTo = new PIXI.action.MoveTo(position.x, position.y, 0.25);
    const callFunc = new PIXI.action.CallFunc(() => this.isAnimating--);
    const sequence = new PIXI.action.Sequence([moveTo, callFunc]);
    this.isAnimating++;
    PIXI.actionManager.runAction(this.sprite, sequence);
    return sequence;
  }

  /**
   * Rotates this card to a specific position in world space with animation.
   * @param {number} rotation
   * @return {PIXI.action.Sequence}
   */
  _rotateToWithAnimation(rotation) {
    const rotateTo = new PIXI.action.RotateTo(rotation, 0.25);
    const callFunc = new PIXI.action.CallFunc(() => this.isAnimating--);
    const sequence = new PIXI.action.Sequence([rotateTo, callFunc]);
    this.isAnimating++;
    PIXI.actionManager.runAction(this.sprite, sequence);
    return sequence;
  }

  /**
   * Scales this card to a specific scale in world space with animation.
   * @param {number} scale
   * @return {PIXI.action.Sequence}
   */
  _scaleToWithAnimation(scale) {
    const scaleTo = new PIXI.action.ScaleTo(scale, scale, 0.25);
    const callFunc = new PIXI.action.CallFunc(() => this.isAnimating--);
    const sequence = new PIXI.action.Sequence([scaleTo, callFunc]);
    this.isAnimating++;
    PIXI.actionManager.runAction(this.sprite, sequence);
    return sequence;
  }

  /**
   * Moves this card to its original location.
   */
  moveToOrigPosition() {
    this._moveToWithAnimation(this.dragOrigPosition); //probably the original slot it was residing
    this._rotateToWithAnimation(this.dragOrigRotation);
    this._scaleToWithAnimation(this.dragOrigScale);
  }

  /**
   * Moves this card to a specific slot.
   * @param {number} slot
   * @return {PIXI.action.Sequence}
   */
  moveToSlot(slot) {
    return this._moveToWithAnimation(getCardPositionForSlot(this.sprite.texture, slot));
  }

  /**
   * Move this card to the score button.
   */
  moveToScoreButton() {
    const scoreButtonPosition = stage.getChildByName('scoreButton').position;
    const moveTo = new PIXI.action.MoveTo(scoreButtonPosition.x, scoreButtonPosition.y, 0.25);
    const fadeOut = new PIXI.action.FadeOut(0.25);
    const callFunc = new PIXI.action.CallFunc(() => {
      this.sprite.parent.removeChild(this.sprite);
    });
    const sequence = new PIXI.action.Sequence([fadeOut, callFunc]);
    PIXI.actionManager.runAction(this.sprite, moveTo);
    PIXI.actionManager.runAction(this.sprite, sequence);
  }
}

/**
 *Card slots
 */
class CardSlot {
  constructor() {
    /** @type {Card} */
    this.card = null;

    /** @type {bool} */
    this.present = false;
  }
}

/**
 * Sets up events for an active card.
 * @param {Card} card
 */
function initCardEvents(card) {
  card.sprite.interactive = true;

  const onTouchStart = function (e) {
    // Don't allow interaction if card is being animated.
    if (card.isAnimating) { return; }

    // If the card is active, scale it down to the normal size.
    if (card.isActive) {
      const scale = getCardScaleInSlot(card.sprite.texture);
      const scaleTo = new PIXI.action.ScaleTo(scale, scale, 0.25);
      const rotateTo = new PIXI.action.RotateTo(0.0, 0.25);

      PIXI.actionManager.runAction(card.sprite, scaleTo);
      PIXI.actionManager.runAction(card.sprite, rotateTo);
    }

    // Offset the drag so we get an accurate touch point.
    card.isBeingDragged = true;
    card.dragPointerId = e.data.identifier;
    card.dragOffset = e.data.getLocalPosition(card.sprite);
    card.dragOffset.x *= card.sprite.scale.x;
    card.dragOffset.y *= card.sprite.scale.y;
    card.dragOrigPosition = new PIXI.Point(
      card.sprite.position.x,
      card.sprite.position.y
    );
    card.dragOrigRotation = card.sprite.rotation;
    card.dragOrigScale = card.sprite.scale.x;
  };

  const onTouchMove = function (e) {
    if (card.isBeingDragged &&
      card.dragPointerId === e.data.identifier) {
      card.sprite.position.set(
        e.data.global.x - card.dragOffset.x,
        e.data.global.y - card.dragOffset.y
      );

      // Check if we're above score or discard buttons.
      card.dragTarget = getTargetByPoint(card, new PIXI.Point(
        e.data.global.x,
        e.data.global.y
      ));

      // Tint card red when in the discard zone.
      const discard = stage.getChildByName('discard');
      card.sprite.tint = (card.dragTarget === discard) ? 0xff0000 : 0xffffff;

      // Re-render the scene.
      renderer.isDirty = true;
    }
  };

  const onTouchEnd = function (e) {
    // Don't allow interaction if card is being animated.
    if (card.isAnimating || !card.isBeingDragged) { return; }
    card.isBeingDragged = false;

    // If there's a drag target, move the card there.
    // If discard: destroy the card
    // If score: add the score
    // If slot number: move to a slot
    if (card.dragTarget === stage.getChildByName('discard')) {
      discardCard(card);
    } else if (card.dragTarget === stage.getChildByName('scoreButton')) {
      if (state.cardsMatchingSelectedGoal &&
          state.cardsMatchingSelectedGoal.indexOf(card) >= 0) {
        scoreCardSet(state.selectedGoal, state.cardsMatchingSelectedGoal);
      } else {
        card.moveToOrigPosition();
      }
    } else if (card.dragTarget >= 0 && card.dragTarget < 6) {
      if (card.isActive && card.dragTarget !== null && !state.cardSlots[card.dragTarget].present) {
        assignActiveCardToSlot(card.dragTarget);
      } else {
        card.moveToOrigPosition();
      }
    } else {
      card.moveToOrigPosition();
    }
  };

  card.sprite
    .on('touchstart', onTouchStart)
    .on('touchmove', onTouchMove)
    .on('touchend', onTouchEnd)
    .on('touchendoutside', onTouchEnd)
    .on('touchcancel', onTouchEnd);
}

/**
 * Scores the given card set.
 * @param {string} goal
 * @param {Array.<Card>} cardSet
 */
function scoreCardSet(goal, cardSet) {
  // Remove matching cards.
  state.cardSlots.filter(slot => slot.present)
    .forEach(slot => {
      const card = cardSet.find(card => card === slot.card);
      if (card) {
        card.moveToScoreButton();
        slot.present = false;
      }
    });

  // Send score and achievement to server.
  reportScore(GoalTypesMetadata[goal].score);
  reportGoal(goal);

  // Update score.
  state.score = state.score + GoalTypesMetadata[goal].score;
  state.selectedGoal = null;
  state.cardsMatchingSelectedGoal = null;

  // We need to delay the execution of this so that animation completes.
  const delayTime = new PIXI.action.DelayTime(0.25);
  const callFunc = new PIXI.action.CallFunc(() => {
    if (!GoalTypesMetadata[goal].isHidden) {
      createRandomGoal(stage.getChildByName('goal'));
    } else {
      checkIfGoalMet();
    }
  });
  const sequence = new PIXI.action.Sequence([delayTime, callFunc]);
  PIXI.actionManager.runAction(stage, sequence);
}

/**
 * Checks if the given goal is met.
 */
function checkIfGoalMet() {
  const cardSet = state.cardSlots
    .filter(slot => slot.present)
    .map(slot => slot.card);

  state.goalSets = {};
  Object.keys(GoalTypesMetadata)
    .filter(goal => GoalTypesMetadata[goal].isHidden)
    .forEach(goal => {
      const goalCardSet = cardSetMeetsGoal(cardSet, goal);
      if (goalCardSet.length > 0) {
        state.goalSets[goal] = goalCardSet;
      }
    });

  // Check the active goal.
  const activeGoalCardSet = cardSetMeetsGoal(cardSet, state.goal);
  if (activeGoalCardSet.length > 0) {
    state.goalSets[state.goal] = activeGoalCardSet;
  }

  updateGoals(state.goalSets);
}

/**
 * Updates the goals section in the UI.
 * @param {Object.<string, Array.<Card>>}
 */
function updateGoals(goalSets) {
  /** @type {PIXI.Container} */
  const tray = stage.getChildByName('tray');
  const stageGoalBar = stage.getChildByName('goalBar');
  const goalsContainer = stage.getChildByName('goalsContainer');
  const goalsContainerHeight = 128.0 * contentScale * Object.keys(goalSets).length;
  goalsContainer.removeChildren();

  Object.keys(goalSets).map((goal, index) => {
    const description = GoalTypesMetadata[goal].description;
    const isHidden = GoalTypesMetadata[goal].isHidden;
    const barSpriteColor = isHidden ? 'Green' : 'Yellow';
    const barTextColor = isHidden ? 0xffffff : 0x806200;

    const goalBarTexture = PIXI.loader.resources[`resources/Collection-Bar-${barSpriteColor}-9x16.png`].texture;
    const goalBarHeight = goalBarTexture.height * contentScale;
    const goalBar = new PIXI.extras.TilingSprite(goalBarTexture, window.innerWidth, goalBarHeight);
    goalBar.anchor.set(0.0, 0.0);
    goalBar.tileScale.set(1.0, contentScale);
    goalBar.position.set(0.0, goalBarHeight * index);

    const goalBarShadowTexture = PIXI.loader.resources['resources/Collection-Shadow-9x16.png'].texture;
    const goalBarShadowHeight = goalBarHeight;
    const goalBarShadow = new PIXI.extras.TilingSprite(goalBarShadowTexture, window.innerWidth, goalBarShadowHeight);
    goalBarShadow.anchor.set(0.0, 0.0);
    goalBarShadow.tileScale.set(1.0, contentScale);
    goalBar.addChild(goalBarShadow);

    const goalBarText = new PIXI.Text();
    goalBarText.text = description;
    goalBarText.style.fill = barTextColor;
    goalBarText.style.fontFamily = 'proxima-nova-excn';
    goalBarText.style.fontSize = 104 * contentScale;
    goalBarText.anchor.set(0.0, 0.5);
    goalBarText.position.set(64 * contentScale, goalBarHeight / 2);
    goalBar.addChild(goalBarText);

    const goalBarHighlight = new PIXI.Graphics();
    goalBarHighlight.beginFill(0x000000, 0.5);
    goalBarHighlight.drawRect(0.0, 0.0, window.innerWidth, goalBarHeight);
    goalBarHighlight.endFill();
    goalBarHighlight.name = 'goalBarHighlight';
    goalBarHighlight.visible = false;
    goalBar.addChild(goalBarHighlight);

    initGoalBarEvents(goalBar, goal, goalSets[goal]);
    goalsContainer.addChild(goalBar);
  });

  goalsContainer.position.set(0.0, window.innerHeight - tray.height - stageGoalBar.height - goalsContainerHeight);
  invalidateDragToScore();
}

/**
 * Initialzes events for the goal bar.
 * @param {PIXI.Sprite} goalBar
 * @param {string} goal
 * @param {Array.<Card>} matchingCards
 */
function initGoalBarEvents(goalBar, goal, matchingCards) {
  goalBar.interactive = true;

  function onTouchStart() {
    const highlight = goalBar.getChildByName('goalBarHighlight');
    highlight.visible = true;
    renderer.isDirty = true;
  }

  function onTouchEnd() {
    const highlight = goalBar.getChildByName('goalBarHighlight');
    highlight.visible = false;
    state.cardsMatchingSelectedGoal = matchingCards;
    state.selectedGoal = goal;
    renderer.isDirty = true;
  }

  goalBar
    .on('touchstart', onTouchStart)
    .on('touchend', onTouchEnd)
    .on('touchendoutside', onTouchEnd)
    .on('touchcancel', onTouchEnd);
}

/**
 * Highlights cards matching the selected goal.
 */
function highlightCardsMatchingGoal() {
  state.cardSlots.filter(slot => slot.present)
    .map(slot => slot.card.sprite)
    .forEach(sprite => sprite.tint = 0xffffff);

  state.cardsMatchingSelectedGoal.forEach(card => {
    const tintTo = new PIXI.action.TintTo(0x00ff00, 0.25);
    PIXI.actionManager.runAction(card.sprite, tintTo);
  });
}

/**
 * Invalidates the drag to score section.
 * This redraws the section to fit the button.
 */
function invalidateDragToScore() {
  const goalsContainer = stage.getChildByName('goalsContainer');

  // Redraw the shadow.
  const bottomShadow = stage.getChildByName('bottomShadow');
  bottomShadow.position.set(0, goalsContainer.position.y);

  // These nodes are needed to compute the height.
  const tray = stage.getChildByName('tray');
  const whiteBanner = stage.getChildByName('whiteBanner');
  const discard = stage.getChildByName('discard');
  const scoreBar = stage.getChildByName('scoreBar');
  const scoreButton = stage.getChildByName('scoreButton');

  // Compute height and width of the button.
  const height = window.innerHeight -
    // Margins
    128.0 * 2 * contentScale -
    // Bottom part of screen
    tray.height - scoreBar.height - goalsContainer.height -
    // Top part of screen
    whiteBanner.height - discard.height;
  const width = window.innerWidth - 128.0 * 2 * contentScale;
  const scaleX = width / scoreButton.texture.width;
  const scaleY = height / scoreButton.texture.height;
  const scale = Math.min(scaleX, scaleY);

  // Position the button.
  scoreButton.position.set(
    window.innerWidth / 2,
    (goalsContainer.position.y - discard.position.y + discard.height) / 2
  );
  scoreButton.scale.set(scale, scale);
}

/**
 * Check if the given list of cards meets the goal.
 * @param {Array.<Card>} cardSet
 * @param {string} goal
 * @returns {boolean}
 */
function cardSetMeetsGoal(cardSet, goal) {
  const numOnBase = cardSet.filter(card => PlaybookEventsIsOnBase[card.play]).length;
  const numOut = cardSet.filter(card => (
    PlaybookEventsIsOut[card.play] &&
    card.play !== PlaybookEvents.TRIPLE_PLAY &&
    card.play !== PlaybookEvents.DOUBLE_PLAY
  )).length;
  const numRed = cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'BATTING')).length;
  const numBlue = cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'FIELDING')).length;
  const numRBI = cardSet.filter(card => card.play === PlaybookEvents.RUN_SCORED).length;
  const numSteal = cardSet.filter(card => card.play === PlaybookEvents.STEAL).length;
  const numPickOff = cardSet.filter(card => card.play === PlaybookEvents.PICK_OFF).length;
  const numDoublePlay = cardSet.filter(card => card.play === PlaybookEvents.DOUBLE_PLAY).length;
  const numTriplePlay = cardSet.filter(card => card.play === PlaybookEvents.TRIPLE_PLAY).length;

  const cardCounts = {};
  cardSet.forEach(card => {
    if (cardCounts[card.play] === undefined) {
      cardCounts[card.play] = 1;
    } else {
      cardCounts[card.play]++;
    }
  });

  let cardsMetGoal = new Array();

  switch (goal) {
    case GoalTypes.BASE_STEAL_RBI: {
      if ((numOnBase > 0) && (numRBI > 0) && (numSteal > 0)) {
        const cardOnBase = cardSet.find(card => PlaybookEventsIsOnBase[card.play]);
        const cardSteal = cardSet.find(card => card.play === PlaybookEvents.STEAL);
        const cardRBI = cardSet.find(card => card.play === PlaybookEvents.RUN_SCORED);
        cardsMetGoal.push(cardOnBase);
        cardsMetGoal.push(cardRBI);
        cardsMetGoal.push(cardSteal);
        return cardsMetGoal;
      }
      break;
    }
    case GoalTypes.BASES_RBI_3: {
      if (numOnBase >= 3) {
        return cardSet.filter(card => PlaybookEventsIsOnBase[card.play]);
      }
      break;
    }
    case GoalTypes.EACH_COLOR_1: {
      if ((numBlue >= 1) && (numRed >= 1)) {
        const cardRed = cardSet.find(card => (PlaybookEventsTeams[card.play] === 'BATTING')).length;
        const cardBlue = cardSet.find(card => (PlaybookEventsTeams[card.play] === 'FIELDING')).length;
        cardsMetGoal.push(cardBlue);
        cardsMetGoal.push(cardRed);
        return cardsMetGoal;
      }
      break;
    }
    case GoalTypes.EACH_COLOR_2: {
      if ((numBlue >= 1) && (numRed >= 1)) {
        cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'BATTING'))
          .forEach((card, i) => {
            if (i < 2) {
              cardsMetGoal.push(card);
            }
          });

        cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'FIELDING'))
          .forEach((card, i) => {
            if (i < 2) {
              cardsMetGoal.push(card);
            }
          });

        return cardsMetGoal;
      }
      break;
    }
    case GoalTypes.FULL_HOUSE: {
      const plays2 = Object.keys(cardCounts).find(play => cardCounts[play] === 2);
      const plays3 = Object.keys(cardCounts).find(play => cardCounts[play] === 3);
      if (plays2 !== undefined && plays3 !== undefined && plays2 !== plays3) {
        const cards2 = cardSet.filter(card => card.play === plays2);
        const cards3 = cardSet.filter(card => card.play === plays3);
        return [...card2, ...cards3];
      }
      break;
    }
    case GoalTypes.IDENTICAL_CARDS_3: {
      const plays = Object.keys(cardCounts).filter(play => cardCounts[play] === 3);
      if (plays.length > 0) {
        return cardSet.filter(card => card.play === plays[0]);
      }
      break;
    }
    case GoalTypes.IDENTICAL_CARDS_4: {
      const plays = Object.keys(cardCounts).filter(play => cardCounts[play] === 4);
      if (plays.length > 0) {
        return cardSet.filter(card => card.play === plays[0]);
      }
      break;
    }
    case GoalTypes.IDENTICAL_CARDS_5: {
      const plays = Object.keys(cardCounts).filter(play => cardCounts[play] === 5);
      if (plays.length > 0) {
        return cardSet.filter(card => card.play === plays[0]);
      }
      break;
    }
    case GoalTypes.ON_BASE_STEAL_PICK_OFF: {
      if ((numOnBase > 0) && (numPickOff > 0) && (numSteal > 0)) {
        const cardOnBase = cardSet.find(card => PlaybookEventsIsOnBase[card.play]);
        const cardSteal = cardSet.find(card => card.play === PlaybookEvents.STEAL);
        const cardPickOff = cardSet.find(card => card.play === PlaybookEvents.PICK_OFF);
        cardsMetGoal.push(cardOnBase);
        cardsMetGoal.push(cardPickOff);
        cardsMetGoal.push(cardSteal);
        return cardsMetGoal;

      }
      break;
    }
    case GoalTypes.OUT_3: { //I think should be exactly 3 outs, so 2 double plays can't satisfy
      const totalOuts = numOut + numDoublePlay * 2 + numTriplePlay * 3;
      if (totalOuts >= 3) {
        if (numTriplePlay > 0) {
          return cardSet.find(card => card.play === PlaybookEvents.TRIPLE_PLAY);
        }
        else if (numDoublePlay > 0) {
          const cardDoublePlay = cardSet.find(card => card.play === PlaybookEvents.DOUBLE_PLAY);
          const cardOut = cardSet.find(card => PlaybookEventsIsOut[card.play]);
          cardsMetGoal.push(cardDoublePlay);
          cardsMetGoal.push(cardOut);
          return cardsMetGoal;
        }
        else {
          return cardSet.filter(card => PlaybookEventsIsOut[card.play])
            .slice(0, 3);

        }
      }
      break;
    }

    case GoalTypes.SAME_COLOR_3: {
      if ((numBlue >= 3) || (numRed >= 3)) {
        if (numRed >= 3) {
          return cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'BATTING'))
            .slice(0, 3);
        }
        else if ((numBlue >= 3)) {
          return cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'FIELDING'))
            .slice(0, 3);
        }
      }
      break;
    }
    case GoalTypes.SAME_COLOR_4: {
      if ((numBlue >= 4) || (numRed >= 4)) {
        if (numRed >= 4) {
          return cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'BATTING'))
            .slice(0, 4);
        }
        else if ((numBlue >= 4)) {
          return cardSet.filter(card => (PlaybookEventsTeams[card.play] === 'FIELDING'))
            .slice(0, 4);
        }
      }
      break;
    }
    case GoalTypes.SAME_COLOR_5: {
      if (numBlue === 5 || numRed === 5) {
        return cardSet;
      }
      break;
    }
    case GoalTypes.UNIQUE_OUT_CARDS_3: {
      let cardArray = new Array();
      const outCards = cardSet.filter(card => PlaybookEventsIsOut[card.play]);
      cardArray = outCards;
      outCards.forEach(cardIt => {
        outCards.forEach(card => {
          if (cardIt.name === card.play) {
            cardArray.splice(cardArray.indexOf(card), 1);
          }
        });
      });
      if (cardArray.length >= 3) {
        return cardArray.slice(0, 3);
      }

      break;
    }
    case GoalTypes.UNIQUE_OUT_CARDS_4: {
      let cardArray = new Array();
      const outCards = cardSet.filter(card => PlaybookEventsIsOut[card.play]);
      cardArray = outCards;
      outCards.forEach(cardIt => {
        outCards.forEach(card => {
          if (cardIt.name === card.play) {
            cardArray.splice(cardArray.indexOf(card), 1);
          }
        });
      });
      if (cardArray.length >= 4) {
        return cardArray.slice(0, 4);
      }
      break;
    }
    case GoalTypes.WALK_OR_HIT_BY_PITCH_3: {
      const walkOrHitList = cardSet.filter(card =>
        card.play === PlaybookEvents.WALK ||
        card.play === PlaybookEvents.HIT_BY_PITCH
      );
      if (walkOrHitList.length >= 3) {
        return walkOrHitList.slice(0, 3);
      }
      break;
    }

    default:
      console.warn('Unknown goal', goal);
  }

  return cardsMetGoal;
}

/**
 * Assigns the active card to a specific slot.
 * @param {number} slot
 */
function assignActiveCardToSlot(slot) {
  // Copy card into slot list.
  state.cardSlots[slot].card = state.activeCard;
  state.cardSlots[slot].present = true;
  state.cardSlots = state.cardSlots.slice();
  state.activeCard = null;

  const card = state.cardSlots[slot].card;
  card.moveToSlot(slot);
  card.isActive = false;
  state.isCardActive = false;

  // Check if the set of cards meet the goal.
  checkIfGoalMet();
}

/**
 * Discards a given card.
 * @param {Card} card
 */
function discardCard(card) {
  if (state.isCardActive) {
    if (state.activeCard !== card) {
      console.warn('A card is active, but card to be discarded is not the active card!');
      return;
    }

    stage.removeChild(state.activeCard.sprite);
    state.activeCard = null;
    state.isCardActive = false;
  } else {
    const slot = state.cardSlots.find(slot => slot.card === card);
    if (slot === undefined) {
      console.warn('Attempting to discard card that doesn\'t exist in slot!');
      return;
    }

    slot.present = false;
    stage.removeChild(slot.card.sprite);
    slot.card = null;

    // Notify listeners that the slots have been updated.
    state.cardSlots = state.cardSlots.slice();
  }

  renderer.isDirty = true;
  checkIfGoalMet();
}

/**
 * Given a point in world space, returns a possible drag target.
 * @param {Card} card
 * @param {PIXI.Point} position
 * @returns {PIXI.Sprite?}
 */
function getTargetByPoint(card, position) {
  //const local = card.toLocal(position);
  const discard = stage.getChildByName('discard');
  const scoreButton = stage.getChildByName('scoreButton');
  const tray = stage.getChildByName('tray');

  if (discard.getBounds().contains(position.x, position.y)) {
    return discard; //discard
  } else if (scoreButton.getBounds().contains(position.x, position.y)) {
    return scoreButton; //calculate score
  } else if (tray.getBounds().contains(position.x, position.y)) {
    return getNearestSlot(card, position);
  }
}

/**
 * Returns the world space position for a ball slot.
 * @param {PIXI.Texture} cardTexture
 * @param {PIXI.Sprite} cardSlot
 * @param {Number} i
 */
function getCardSlotPositionFor(cardTexture, i) {
  const cardScale = stage.getChildByName['tray'].sprite.texture.height / cardTexture.height / 1.5;
  return stage.getChildByName['tray'].toGlobal(new PIXI.Point(
    120 + cardTexture.width * i * cardScale,
    stage.getChildByName['tray'].sprite.texture.height / 2
  ));
};

/**
 * Listens to changes on the goal state.
 * @param {PIXI.Sprite} goalSprite
 */
function initGoalEvents(goalSprite) {
  state.emitter.on(state.EVENT_GOAL_CHANGED, function (goal) {
    if (goal === null) {
      createRandomGoal();
    } else {
      setActiveGoal(GoalTypesMetadata[goal], goalSprite);
    }
  });
}

/**
 * Listen to changes on the selected state.
 */
function initSelectedGoalEvent() {
  state.emitter.on(state.EVENT_SELECTED_GOAL_CHANGED, function (goal) {
    if (state.selectedGoal && state.cardsMatchingSelectedGoal) {
      highlightCardsMatchingGoal();
    }
  });
}

/**
 * Creates a random goal.
 */
function createRandomGoal() {
  // Only set visible goals.
  const visibleGoals = Object.keys(GoalTypesMetadata)
    .filter(goal => !GoalTypesMetadata[goal].isHidden);
  const randomChoice = Math.floor((Math.random() * visibleGoals.length));
  state.goal = visibleGoals[randomChoice];
}

/**
 * Updates the given goal sprite with the given goal.
 * @param {string} goal
 * @param {PIXI.Sprite} goalSprite
 */
function setActiveGoal(goal, goalSprite) {
  const newTexture = PIXI.loader.resources[`resources/${goal.file}`].texture;
  goalSprite.texture = newTexture;

  // Invalidate.
  checkIfGoalMet();
}

function handleIncomingMessage(message) {
  switch (message.event) {
    case 'server:playsCreated':
      handlePlaysCreated(message.data);
      break;
    case 'server:clearPredictions':
      handleClearPredictions();
      break;
    default:
  }
}

/**
 * Handles plays created event.
 * @param {Array.<number>} events
 */
function handlePlaysCreated(events) {
  const plays = events.map(PlaybookEvents.getById);
  for (const play of plays) {
    state.incomingCards.push(play);
    renderer.isDirty = true;
  }
}

/**
 * Receives a card from the server.
 * @param {string} play
 */
function receiveCard(play) {
  const card = createCard(play);
  if (!card) { return; }

  state.activeCard = card;
  state.isCardActive = true;
  card.isActive = true;
  const cardNode = card.sprite;

  const cardScale = window.innerWidth / card.sprite.texture.width * 0.5;

  // Animate the appearance of the card.
  const fadeIn = new PIXI.action.FadeIn(0.5);
  const scaleTo = new PIXI.action.ScaleTo(cardScale, cardScale, 0.5);
  PIXI.actionManager.runAction(cardNode, fadeIn);
  PIXI.actionManager.runAction(cardNode, scaleTo);

  // Save these so that the animations can use them later.
  card.dragOrigPosition = new PIXI.Point(cardNode.position.x, cardNode.position.y);
  card.dragOrigRotation = cardNode.rotation;
  card.dragOrigScale = cardScale;

  initCardEvents(card);
}

/**
 * Creates a card on the screen.
 * @param {string} play
 * @param {boolean?} isActive
 * @param {number?} slot
 * @returns {Card}
 */
function createCard(play, isActive = true, slot) {
  const team = PlaybookEventsTeams[play];
  let teamString;
  switch (team) {
    case 'FIELDING':
      teamString = 'F-';
      break;
    case 'BATTING':
      teamString = 'B-';
      break;
    default:
      return;
  }

  const mapString = PlaybookEventsStringMap[play];
  const cardTexture = PIXI.loader.resources[`resources/cards/Card-${teamString}${mapString}.jpg`].texture;

  const card = new PIXI.Sprite(cardTexture);
  card.anchor.set(0.5, 0.5);
  if (isActive) {
    card.position.set(window.innerWidth / 2, window.innerHeight / 2);
    card.scale.set(0, 0);
    card.rotation = PIXI.DEG_TO_RAD * (Math.floor(Math.random() * 10) + -5);
  } else {
    const position = getCardPositionForSlot(cardTexture, slot);
    const scale = getCardScaleInSlot(cardTexture);
    card.position.set(position.x, position.y);
    card.scale.set(scale, scale);
  }

  const cardObj = new Card(team, play, card);
  cardObj.sprite = card;
  state.cards.push(card);
  stage.addChild(card);

  return cardObj;
}
/**
 * Sets up the renderer. Adjusts the renderer according to the size of the
 * viewport, and adds it to the DOM tree.
 * @param {PIXI.WebGLRenderer} renderer
 */
function configureRenderer(renderer) {
  const resizeToFitWindow = function (renderer) {
    renderer.resize(window.innerWidth, window.innerHeight);
  };

  renderer.view.style.position = 'absolute';
  renderer.view.style.display = 'block';
  renderer.autoResize = true;
  resizeToFitWindow(renderer);
  document.body.appendChild(renderer.view);
  window.addEventListener('resize', resizeToFitWindow.bind(this, renderer));
};

/**
 * Sets up the WebSocket connection.
 * @param {WebSocket} connection
 */
function configureWebSocket(connection) {
  connection.addEventListener('open', function () {
    console.log(`Connected to ${connection.url}`);
  });

  connection.addEventListener('message', function (message) {
    message = JSON.parse(message.data);
    handleIncomingMessage(message);
  });
};

/**
 * Returns the card's position given a slot number.
 * @param {PIXI.Texture} cardTexture
 * @param {number} i
 */
function getCardPositionForSlot(cardTexture, i) {
  const trayScale = stage.getChildByName('tray').scale.x;
  const cardScale = getCardScaleInSlot(cardTexture);
  const scaledWidth = cardTexture.width * cardScale;
  const scaledHeight = cardTexture.height * cardScale;
  return new PIXI.Point(
    (48.0 * trayScale) + (i * 24.0 * trayScale) + // Left margin and slot margins
    (i + 0.5) * scaledWidth, // Space occupied by slot,
    window.innerHeight - ((48.0 * trayScale) + (scaledHeight * 0.5))
  );
};

/**
 * Returns the scale of a card in a slot.
 * @param {PIXI.Texture} cardTexture
 */
function getCardScaleInSlot(cardTexture) {
  const trayScale = stage.getChildByName('tray').scale.x;
  const cardHolderWidth = (window.innerWidth - (48.0 * trayScale * 2) - ((5/*NUM_SLOTS*/ - 1) * 24.0 * trayScale)) / 5.0;
  return cardHolderWidth / cardTexture.width;
}

/**
 * Returns the nearest available card slot.
 * @param {Card} card
 * @param {PIXI.Point} position
 * @returns {number?}
 */
function getNearestSlot(card, position) {
  let slot = null;
  let smallestDistance = Number.MAX_VALUE;
  state.cardSlots.forEach((cardSlot, i) => {
    if (!cardSlot.present) {
      const slotPosition = getCardPositionForSlot(card.sprite.texture, i);
      const dist = distance(slotPosition, position);
      if (dist < smallestDistance) {
        slot = i;
        smallestDistance = dist;
      }
    }
  });

  return slot;
}

/**
 * Computes the distance between two points.
 * @param {PIXI.Point} p1
 * @param {PIXI.Point} p2
 * @returns {number}
 */
function distance(p1, p2) {
  const disx = Math.pow(p1.x - p2.x, 2);
  const disy = Math.pow(p1.y - p2.y, 2);
  return (Math.sqrt(disx + disy));
}

/**
 * Initializes events for the score.
 * @param {PIXI.Text} scoreText
 */
function initScoreEvents(scoreText) {
  state.emitter.on(state.EVENT_SCORE_CHANGED, function (score) {
    scoreText.text = ('000000' + score).substr(-3);

    const origScale = scoreText.scale.x;
    scoreText.scale.set(origScale * 3, origScale * 3);
    scoreText.alpha = 0;

    const scaleTo = new PIXI.action.ScaleTo(origScale, origScale, 0.5);
    const fadeIn = new PIXI.action.FadeIn(0.5);
    PIXI.actionManager.runAction(scoreText, scaleTo);
    PIXI.actionManager.runAction(scoreText, fadeIn);
  });
}

/**
 * Report a scoring event to the server.
 * @param {number} score
 */
function reportScore(score) {
  const request = new XMLHttpRequest();
  request.open('POST', `${PlaybookBridge.getSectionAPIUrl()}/updateScore`);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify({
    cat: 'collect',
    collectScore: score,
    id: PlaybookBridge.getPlayerID()
  }));
}

/**
 * Reports a trophy achievement to the server.
 * @param {string} goal
 */
function reportGoal(goal) {
  const request = new XMLHttpRequest();
  request.open('POST', `${PlaybookBridge.getSectionAPIUrl()}/updateTrophy`);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify({
    trophyId: GoalTypesMetadata[goal].serverId,
    userId: PlaybookBridge.getPlayerID()
  }));
}

/**
 * Update trophy case to the server.
 * @param {string}
 */
function updateTrophy(goal) {
  const request = new XMLHttpRequest();
  request.open('POST', `${PlaybookBridge.getSectionAPIUrl()}/updateTrophy`);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify({
    userId: PlaybookBridge.getPlayerID(),
    trophyId: GoalTypesMetadata[goal].serverId
  }));
}

function setup() {
  // Add background to screen.
  const bgTexture = PIXI.loader.resources['resources/Collection-BG-Wood.jpg'].texture;
  const bg = new PIXI.Sprite(bgTexture);
  bg.scale.x = window.innerWidth / bgTexture.width;
  bg.scale.y = window.innerHeight / bgTexture.height;
  stage.addChild(bg);

  // Add banner on top to screen.
  /*
  const bannerTexture = PIXI.loader.resources['resources/Collection-Banner-9x16.png'].texture
  const banner = new PIXI.Sprite(bannerTexture);
  const bannerScale = window.innerWidth / bannerTexture.width;
  const bannerHeight = bannerScale * bannerTexture.height;
  banner.scale.set(bannerScale, bannerScale);
  banner.zOrder = 1;
  stage.addChild(banner);
*/
  // Add card tray to screen.
  const trayTexture = PIXI.loader.resources['resources/Collection-Tray-9x16.png'].texture;
  const tray = new PIXI.Sprite(trayTexture);
  const trayScale = window.innerWidth / trayTexture.width;
  const trayHeight = trayScale * trayTexture.height;
  tray.name = 'tray';
  tray.position.set(0, window.innerHeight - trayHeight);
  tray.scale.set(trayScale, trayScale);
  //_tray = tray;
  stage.addChild(tray);

  // Use the tray scale as a scaling baseline.
  contentScale = tray.scale.x;

  // Add top shadow
  const topShadowTexture = PIXI.loader.resources['resources/Collection-Shadow-Overturn.png'].texture;
  const topShadowHeight = topShadowTexture.height * contentScale;
  const topShadow = new PIXI.extras.TilingSprite(topShadowTexture, window.innerWidth, topShadowHeight);
  topShadow.name = 'shadowTop';
  topShadow.position.set(0, 48);
  topShadow.tileScale.set(1.0, contentScale);
  stage.addChild(topShadow);

  // Add score bar
  const scoreBarTexture = PIXI.loader.resources['resources/Collection-Bar-Gold-9x16.png'].texture;
  const scoreBarHeight = scoreBarTexture.height * contentScale;
  const scoreBar = new PIXI.extras.TilingSprite(scoreBarTexture, window.innerWidth / 2, scoreBarHeight);
  scoreBar.name = 'scoreBar';
  scoreBar.position.set(0, window.innerHeight - trayHeight - scoreBarHeight);
  scoreBar.tileScale.set(1.0, contentScale);
  stage.addChild(scoreBar);

  // Add score bar shadow
  const scoreBarShadowTexture = PIXI.loader.resources['resources/Collection-Shadow-9x16.png'].texture;
  const scoreBarShadowHeight = scoreBarHeight;
  const scoreBarShadow = new PIXI.extras.TilingSprite(scoreBarShadowTexture, window.innerWidth / 2, scoreBarHeight);
  scoreBarShadow.name = 'shadow';
  scoreBarShadow.position.set(0, window.innerHeight - trayHeight - scoreBarHeight);
  scoreBarShadow.tileScale.set(1, contentScale);
  stage.addChild(scoreBarShadow);

  //Add score label
  /** @type {PIXI.Text} */
  const scoreBarText = new PIXI.Text();
  scoreBarText.position.set(16, scoreBarShadowHeight / 4);
  scoreBarText.text = 'Score:'.toUpperCase();
  scoreBarText.style.fontFamily = 'proxima-nova-excn';
  scoreBarText.style.fill = 0xffffff;
  scoreBarText.style.fontWeight = 900;
  scoreBarText.style.fontSize = 104 * contentScale;
  const scoreBarTextMetrics = PIXI.TextMetrics.measureText(scoreBarText.text, scoreBarText.style);
  scoreBarText.position.set(64 * contentScale, (scoreBarTexture.height - scoreBarTextMetrics.height / contentScale) * contentScale / 2);
  scoreBarShadow.addChild(scoreBarText);

  // Add score
  const scoreBarScore = new PIXI.Text();
  scoreBarScore.text = '000';
  scoreBarScore.style.fontFamily = 'SCOREBOARD';
  scoreBarScore.style.fill = 0xffffff;
  scoreBarScore.style.fontSize = 104 * contentScale;
  const scoreBarScoreMetrics = PIXI.TextMetrics.measureText(scoreBarScore.text, scoreBarScore.style);
  scoreBarScore.name = 'scoreBarScore';
  scoreBarScore.position.set(64 * 2 * contentScale + scoreBarTextMetrics.width, (scoreBarTexture.height - scoreBarScoreMetrics.height / contentScale) * contentScale / 2);
  initScoreEvents(scoreBarScore);
  scoreBarShadow.addChild(scoreBarScore);

  // Add bottom shadow
  const bottomShadowTexture = PIXI.loader.resources['resources/Collection-Shadow-9x16.png'].texture;
  const bottomShadowHeight = bottomShadowTexture.height * contentScale;
  const bottomShadow = new PIXI.extras.TilingSprite(bottomShadowTexture, window.innerWidth, bottomShadowHeight);
  bottomShadow.name = 'bottomShadow';
  bottomShadow.anchor.set(0.0, 1.0);
  bottomShadow.tileScale.set(1.0, contentScale);
  stage.addChild(bottomShadow);

  // Add goal bar
  const goalBarTexture = PIXI.loader.resources['resources/Collection-Bar-Yellow-9x16.png'].texture;
  const goalBarHeight = goalBarTexture.height * contentScale;
  const goalBar = new PIXI.extras.TilingSprite(goalBarTexture, window.innerWidth / 2, goalBarHeight);
  const goalBarScale = window.innerWidth / 2;
  goalBar.name = 'goalBar';
  goalBar.position.set(window.innerWidth / 2, window.innerHeight - trayHeight - goalBarHeight);
  goalBar.tileScale.set(1.0, contentScale);
  stage.addChild(goalBar);

  // Add goal bar shadow
  const goalBarShadowTexture = PIXI.loader.resources['resources/Collection-Shadow-9x16.png'].texture;
  const goalBarShadowHeight = goalBarHeight;
  const goalBarShadow = new PIXI.extras.TilingSprite(goalBarShadowTexture, window.innerWidth / 2, goalBarShadowHeight);
  goalBarShadow.name = 'goalBarShadow';
  goalBarShadow.position.set(window.innerWidth / 2, window.innerHeight - trayHeight - goalBarHeight);
  goalBarShadow.tileScale.set(1.0, contentScale);
  stage.addChild(goalBarShadow);

  // Add goal bar label
  const goalText = new PIXI.Text();
  goalText.text = 'Goal:'.toUpperCase();
  goalText.style.fontFamily = 'proxima-nova-excn';
  goalText.style.fill = 0x806200;
  goalText.style.fontWeight = 900;
  goalText.style.fontSize = 104 * contentScale;
  const goalTextMetrics = PIXI.TextMetrics.measureText(goalText.text, goalText.style);
  goalText.position.set(16, (goalBarTexture.height - goalTextMetrics.height / contentScale) * contentScale / 2);
  goalBar.addChild(goalText);

  // Add hidden container for goals.
  const goalsContainer = new PIXI.Container();
  goalsContainer.name = 'goalsContainer';
  goalsContainer.position.set(0.0, window.innerHeight - tray.height - goalBar.height);
  stage.addChild(goalsContainer);

  // Add goal
  const goalTexture = PIXI.loader.resources['resources/goal/goal1.png'].texture;
  const goalSprite = new PIXI.Sprite(goalTexture);
  const goalScale = (window.innerWidth / 2 - goalTextMetrics.width - 144 * contentScale) / goalSprite.width;
  goalSprite.name = 'goal';
  goalSprite.scale.set(goalScale, goalScale);
  goalSprite.position.set(
    goalBar.position.x + window.innerWidth / 2 - 64 * contentScale,
    goalBar.position.y + goalBar.height - 16 * contentScale
  );
  goalSprite.anchor.set(1.0, 1.0);
  stage.addChild(goalSprite);

  // Add banner on top
  const whiteBannerTexture = PIXI.loader.resources['resources/Prediction-Banner.png'].texture;
  const whiteBanner = new PIXI.Sprite(whiteBannerTexture);
  const whiteBannerScale = window.innerWidth / whiteBannerTexture.width;
  const whiteBannerHeight = whiteBannerScale * whiteBannerTexture.height;
  whiteBanner.name = 'whiteBanner';
  whiteBanner.scale.set(whiteBannerScale, whiteBannerScale);
  stage.addChild(whiteBanner);

  //Add Drag to Discard Banner
  const discardTexture = PIXI.loader.resources['resources/Collection-Banner-9x16.png'].texture;
  const discard = new PIXI.extras.TilingSprite(discardTexture, window.innerWidth, 36);
  //const discardScale = window.innerWidth;
  const discardHeight = 36.0;
  discard.name = 'discard';
  discard.position.set(0, whiteBannerHeight / 2);
  discard.tileScale.set(1, 0.5);
  stage.addChild(discard);

  //Add discard label
  const discardText = new PIXI.Text();
  discardText.position.set(window.innerWidth / 2, discardHeight / 2);
  discardText.anchor.set(0.5, 0.5);
  discardText.text = 'drag plays up to discard'.toUpperCase();
  discardText.style.fontFamily = 'proxima-nova-excn';
  discardText.style.fill = 0xffffff;
  discardText.style.fontWeight = 900;
  discardText.style.fontSize = 104 * contentScale;
  discardText.style.align = 'center';
  discard.addChild(discardText);

  //Add Drag to Score button

  //Add score button
  const scoreButtonTexture = PIXI.loader.resources['resources/Collection-Star-9x16.png'].texture;
  const scoreButton = new PIXI.Sprite(scoreButtonTexture);
  const scoreButtonScale = (window.innerWidth - 128 * 2) / scoreButtonTexture.width;
  const scoreButtonHeight = window.innerHeight - 128 * 2 - trayHeight - scoreBarHeight - discardHeight;
  scoreButton.name = 'scoreButton';
  scoreButton.anchor.set(0.5, 0.5);
  stage.addChild(scoreButton);

  // Generate a random goal.
  initGoalEvents(goalSprite);
  initSelectedGoalEvent();

  /**
   * Begin the animation loop.
   * @param {DOMHighResTimeStamp} now
   */
  function beginDrawLoop(now) {
    const numPendingActions = Object.keys(PIXI.actionManager.actions).length;
    if (numPendingActions > 0) {
      renderer.isDirty = true;
    }

    // Check if we have cards pending in the queue.
    if (!state.isCardActive && state.incomingCards.length > 0) {
      const play = state.incomingCards.pop();
      receiveCard(play);
    }

    // For mobile phones, we don't go full-blast at 60 fps.
    // Re-render only if dirty.
    if (renderer.isDirty) {
      PIXI.actionManager.update((now - lastRenderTime) / 1000);
      renderer.render(stage);
      renderer.isDirty = false;
    }

    lastRenderTime = now;
    requestAnimationFrame(beginDrawLoop);
  };

  let lastRenderTime = performance.now();
  renderer.isDirty = true;
  PlaybookBridge.notifyLoaded();
  beginDrawLoop(lastRenderTime);
};

// Create and configure the renderer.
configureRenderer(renderer);
configureWebSocket(connection);

// Load the sprites we need.
PIXI.loader
  .add('resources/Collection-BG-Wood.jpg')
  .add('resources/Collection-Banner-9x16.png')
  .add('resources/Collection-Tray-9x16.png')
  .add('resources/Collection-Star-9x16.png')
  .add('resources/Collection-Bar-Gold-9x16.png')
  .add('resources/Collection-Bar-Green-9x16.png')
  .add('resources/Collection-Bar-Yellow-9x16.png')
  .add('resources/Collection-Shadow-9x16.png')
  .add('resources/Collection-Shadow-Overturn.png')
  .add('resources/Prediction-Banner.png')
  .add('resources/goal/goal1.png')
  .add('resources/goal/goal2.png')
  .add('resources/goal/goal3.png')
  .add('resources/goal/goal4.png')
  .add('resources/goal/goal5.png')
  .add('resources/goal/goal6.png')
  .add('resources/goal/goal7.png')
  .add('resources/goal/goal8.png')
  .add('resources/goal/goal9.png')
  .add('resources/goal/goal10.png')
  .add('resources/goal/goal11.png')
  .add('resources/goal/goal12.png')
  .add('resources/goal/goal13.png')
  .add('resources/goal/goal14.png')
  .add('resources/goal/goal15.png')
  .add('resources/cards/Card-B-FirstBase.jpg')
  .add('resources/cards/Card-B-GrandSlam.jpg')
  .add('resources/cards/Card-B-HitByPitch.jpg')
  .add('resources/cards/Card-B-HomeRun.jpg')
  .add('resources/cards/Card-B-RunScored.jpg')
  .add('resources/cards/Card-B-SecondBase.jpg')
  .add('resources/cards/Card-B-Steal.jpg')
  .add('resources/cards/Card-B-ThirdBase.jpg')
  .add('resources/cards/Card-B-Walk.jpg')
  .add('resources/cards/Card-F-BlockedRun.jpg')
  .add('resources/cards/Card-F-DoublePlay.jpg')
  .add('resources/cards/Card-F-FieldersChoice.jpg')
  .add('resources/cards/Card-F-FlyOut.jpg')
  .add('resources/cards/Card-F-GroundOut.jpg')
  .add('resources/cards/Card-F-LongOut.jpg')
  .add('resources/cards/Card-F-PickOff.jpg')
  .add('resources/cards/Card-F-Strikeout.jpg')
  .add('resources/cards/Card-F-TriplePlay.jpg')
  .add('resources/cards/Card-F-UnopposedStrikeout.jpg')
  .load(setup);