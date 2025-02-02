//
// Created by ramya on 3/2/17.
//

#ifndef PLAYBOOK_COLLECTION_SCREEN_H
#define PLAYBOOK_COLLECTION_SCREEN_H

#include "cocos2d.h"
#include "json/rapidjson.h"
#include "json/document.h"

#include "PlaybookLayer.h"
#include "PlaybookEvent.h"
#include "PredictionWebSocket.h"

class CollectionScreen : public PlaybookLayer
{
public:

    static cocos2d::Scene* createScene();

    virtual bool init();
    virtual void update(float delta);

    void onEnter();
    void onExit();
    void onResume();
    void onPause();

    // implement the "static create()" method manually
    CREATE_FUNC(CollectionScreen);

private:
    struct Card {
        Card(PlaybookEvent::Team team, PlaybookEvent::EventType event, cocos2d::Sprite* sprite);
        PlaybookEvent::Team team;
        PlaybookEvent::EventType event;
        cocos2d::Sprite* sprite;

        bool isDragged;
        int draggedTouchID;
        cocos2d::Vec2 draggedOrigPosition;
        bool draggedDropping;
    };

    struct CardSlot {
        std::shared_ptr<Card> card;
        bool present;
    };

    enum GoalType {
        IDENTICAL_CARDS_3,
        IDENTICAL_CARDS_4,
        IDENTICAL_CARDS_5,
        UNIQUE_OUT_CARDS_3,
        UNIQUE_OUT_CARDS_4,
        WALK_OR_HIT_BY_PITCH_3,
        OUT_3,
        BASES_RBI_3,
        EACH_COLOR_1,
        EACH_COLOR_2,
        SAME_COLOR_3,
        SAME_COLOR_4,
        SAME_COLOR_5,
        BASE_STEAL_RBI,
        ON_BASE_STEAL_PICK_OFF,
        FULL_HOUSE,
        UNKNOWN
    };

    struct GoalMetadata {
        std::string name;
        std::string description;
        std::string file;
        int score;
        bool isHidden;
        int serverId;
    };

    struct GoalTypeHash {
        template <typename T>
        std::size_t operator()(T t) const {
            return static_cast<std::size_t>(t);
        }
    };

    static const int NUM_SLOTS;
    static const std::unordered_map<GoalType, GoalMetadata, GoalTypeHash> GOAL_TYPE_METADATA_MAP;

    const std::string NODE_NAME_HOLDER = "holder";
    const std::string NODE_NAME_WHITE_BANNER = "whiteBanner";
    const std::string NODE_NAME_SCORE_BAR = "scoreBar";
    const std::string NODE_NAME_SCORE_BAR_SCORE_CARD = "scoreBarScoreCard";
    const std::string NODE_NAME_GOAL_BAR = "goalBar";
    const std::string NODE_NAME_GOAL_BAR_LABEL = "goalBarLabel";
    const std::string NODE_NAME_GOALS_CONTAINER = "goalsContainer";
    const std::string NODE_NAME_DRAG_TO_DISCARD = "dragToDiscard";
    const std::string NODE_NAME_DRAG_TO_SCORE = "dragToScore";
    const std::string NODE_NAME_DRAG_TO_SCORE_SHADOW_BOTTOM = "dragToScoreShadowBottom";

    cocos2d::Node* _visibleNode;
    PredictionWebSocket* _websocket;

    cocos2d::Sprite* _cardsHolder;
    cocos2d::DrawNode* _cardSlotDrawNode;
    std::queue<PlaybookEvent::EventType> _incomingCardQueue;
    std::vector<CardSlot> _cardSlots;

    cocos2d::Node* _dragToDiscard;
    bool _dragToDiscardHovered;
    cocos2d::EventListener* _dragToDiscardListener;

    cocos2d::Sprite* _dragToScore;
    bool _dragToScoreHovered;
    cocos2d::EventListener* _dragToScoreListener;

    cocos2d::Sprite* _goalSprite;
    GoalType _activeGoal;
    GoalType _selectedGoal;
    std::vector<std::weak_ptr<Card>> _cardsMatchingSelectedGoal;

    bool _isCardActive;
    std::shared_ptr<Card> _activeCard;
    cocos2d::Action* _activeCardAction;
    float _activeCardOrigScale;
    cocos2d::Vec2 _activeCardOrigPosition;
    float _activeCardOrigRotation;
    cocos2d::EventListener* _activeEventListener;

    int _score;

    void initEventsDragToDiscard();
    void initEventsDragToScore();
    void invalidateDragToScore();

    void connectToServer();
    void disconnectFromServer();
    void handleServerMessage(const std::string& event,
                             const rapidjson::Value::ConstMemberIterator& data, bool hasData);
    void handlePlaysCreated(const rapidjson::Value::ConstMemberIterator& data, bool hasData);
    void reportScore(int score);
    void reportGoal(GoalType goal);

    std::weak_ptr<Card> getDraggedCard(cocos2d::Touch* touch);
    void receiveCard(PlaybookEvent::EventType event);
    std::shared_ptr<Card> createCard(PlaybookEvent::EventType event);
    void startDraggingActiveCard(cocos2d::Touch* touch);
    void stopDraggingActiveCard(cocos2d::Touch* touch);
    void discardCard(std::weak_ptr<Card> card);
    void scoreCardSet(GoalType goal, const std::vector<std::weak_ptr<Card>>& cardSet);
    void updateScore(int score, bool withAnimation = true);

    float getCardScaleInSlot(cocos2d::Node* card);
    cocos2d::Vec2 getCardPositionForSlot(cocos2d::Node* cardNode, int slot);
    cocos2d::Rect getCardBoundingBoxForSlot(cocos2d::Node* cardNode, int slot);
    void drawBoundingBoxForSlot(cocos2d::Node* cardNode, int slot);
    int getNearestAvailableCardSlot(cocos2d::Node *card, const cocos2d::Vec2 &position);
    void assignCardToSlot(std::shared_ptr<Card> card, int slot);
    void assignActiveCardToSlot(int slot);

    void createRandomGoal();
    void setActiveGoal(GoalType goal);
    void checkIfGoalMet();
    bool cardSetMeetsGoal(const std::vector<std::weak_ptr<Card>>& cardSet,
                          GoalType goal,
                          std::vector<std::weak_ptr<Card>>& outSet);
    void updateGoals(std::unordered_map<GoalType, std::vector<std::weak_ptr<Card>>, GoalTypeHash> goalSets);
    void highlightCardsMatchingGoal();

    void restoreState();
    void saveState();
    std::string serialize();
    void unserialize(const std::string& data);
};

#endif //PLAYBOOK_COLLECTION_SCREEN_H
