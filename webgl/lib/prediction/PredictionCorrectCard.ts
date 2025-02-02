'use strict';
import PlaybookRenderer from '../PlaybookRenderer';
import DismissableCard from '../DismissableCard';
import { FriendlyNames } from '../PlaybookEvents';
import { IOverlayCard } from '../GenericOverlay';

class PredictionCorrectCard extends DismissableCard implements IOverlayCard {
  private _contentScale: number;
  private _event: string;
  private _addedScore: number;

  private _ball: PIXI.Sprite;
  private _textContainer: PIXI.Container;
  private _text: PIXI.Text;
  private _scoreContainer: PIXI.Container;
  private _score1: PIXI.Text;
  private _score2: PIXI.Text;
  private _score3: PIXI.Text;

  emitter: PIXI.utils.EventEmitter = new PIXI.utils.EventEmitter();

  constructor(contentScale: number, renderer: PlaybookRenderer, event: string,
              addedScore: number) {
    super(renderer);

    this._contentScale = contentScale;
    this._event = event;
    this._addedScore = addedScore;

    this._ball = new PIXI.Sprite(PIXI.loader.resources['resources/Item-Ball-Rotated.png'].texture);
    this.addChild(this._ball);

    this._textContainer = new PIXI.Container();
    this.addChild(this._textContainer);

    this._text = new PIXI.Text();
    this._textContainer.addChild(this._text);

    this._scoreContainer = new PIXI.Container();
    this._textContainer.addChild(this._scoreContainer);

    this._score1 = new PIXI.Text();
    this._scoreContainer.addChild(this._score1);

    this._score2 = new PIXI.Text();
    this._scoreContainer.addChild(this._score2);

    this._score3 = new PIXI.Text();
    this._scoreContainer.addChild(this._score3);

    this._initEvents();
    this.visible = false;
  }

  protected _initEvents() {
    super._initEvents();
    this.on('tap', () => this.emitter.emit('dismiss'));
  }

  show() {
    this.visible = true;

    const contentScale = this._contentScale;
    const event = this._event;
    const addedScore = this._addedScore;
    const ball = this._ball;
    const text = this._text;
    const score1 = this._score1;
    const score2 = this._score2;
    const score3 = this._score3;
    const textContainer = this._textContainer;
    const scoreContainer = this._scoreContainer;

    const ballScale = (window.innerWidth - 128.0 * contentScale) / ball.texture.width;
    ball.scale.set(ballScale, ballScale);

    const textStyle = new PIXI.TextStyle({
      fontFamily: 'rockwell',
      fontWeight: 'bold',
      fontSize: 104.0 * contentScale,
      align: 'center',
      fill: 0x002b65,
      wordWrap: true,
      wordWrapWidth: window.innerWidth - 128.0 * contentScale
    });

    text.text = `Prediction Correct:\n ${FriendlyNames[event]}\n`;
    text.style = textStyle;
    const textMetrics = PIXI.TextMetrics.measureText(text.text, text.style);

    score1.text = 'You got ';
    score1.style = textStyle;
    score1.position.set(0, textMetrics.height);
    const textMetricsScore1 = PIXI.TextMetrics.measureText(score1.text, score1.style);

    score2.text = addedScore.toString();
    score2.style.fontFamily = 'SCOREBOARD';
    score2.style.fontSize = 104.0 * contentScale;
    score2.style.align = 'center';
    const textMetricsScore2 = PIXI.TextMetrics.measureText(score2.text, score2.style);
    score2.position.set(
      textMetricsScore1.width,
      textMetrics.height + (textMetricsScore1.height - textMetricsScore2.height - textMetrics.fontProperties.descent)
    );

    score3.text = ` ${addedScore > 1 ? 'points' : 'point'}!`;
    score3.style = textStyle;
    score3.position.set(textMetricsScore1.width + textMetricsScore2.width, textMetrics.height);

    textContainer.position.set(
      ball.width / 2 - textContainer.width / 2,
      ball.height / 2 - textContainer.height / 2
    );

    // Reposition the text to the center of the window.
    const center = new PIXI.Point(window.innerWidth / 2, window.innerHeight / 2);
    const scoreContainerCenter = scoreContainer.toLocal(center);
    scoreContainer.position.x = scoreContainerCenter.x - (scoreContainer.width / 2);

    this.pivot.set(this.width / 2, this.height / 2);
    this.position.set(window.innerWidth / 2, window.innerHeight / 2);

    // Perform animation.
    this.alpha = 0;
    this.scale.set(0.0, 0.0);
    const fadeIn = new PIXI.action.FadeIn(0.5);
    const scaleTo = new PIXI.action.ScaleTo(1.0, 1.0, 0.5);
    PIXI.actionManager.runAction(this, fadeIn);
    PIXI.actionManager.runAction(this, scaleTo);
  }
}

export default PredictionCorrectCard;